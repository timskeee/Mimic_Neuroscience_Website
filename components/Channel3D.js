import React, { useEffect, useRef } from 'react'
import styles from '../styles/channel3d.module.css'

// Channel3D: lightweight three.js viewer scaffold
// Props:
// - width, height: canvas size in px (optional)
// - mutationPosition: { x, y, z } in normalized channel coords [-1..1]
// - background: CSS color
export default function Channel3D({ width = 960, height = 720, mutationPosition = { residue: 986, name: 'PHE' }, background = 'transparent', modelUrl = '/mmdb_6J8E.pdb' }) {
  const mountRef = useRef(null)
  const cleanupRef = useRef(null)

  useEffect(() => {
    let mounted = true
    let renderer, scene, camera, controls

    async function setup() {
      try {
        const THREE = await import('three')
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls')

        if (!mounted) return

        scene = new THREE.Scene()
        camera = new THREE.PerspectiveCamera(50, width / Math.max(1, height), 0.1, 1000)
        camera.position.set(0, 0, 4)

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        renderer.setSize(width, height)
        renderer.setPixelRatio(window.devicePixelRatio || 1)
        renderer.setClearColor(0x000000, 0) // transparent background

        mountRef.current.innerHTML = ''
        // ensure mount is positioned so we can overlay controls
        mountRef.current.style.position = 'relative'
        mountRef.current.appendChild(renderer.domElement)

        // create simple left-side controls overlay (single column: Left, Right, Up, Down, +, -)
        const controlsEl = document.createElement('div')
        controlsEl.className = styles.controls
        controlsEl.style.pointerEvents = 'auto'
        // helper to make buttons (store discrete click action on element)
        const makeBtn = (label, onClick) => {
          const b = document.createElement('button')
          b.innerText = label
          b.className = styles.button
          b.__clickAction = onClick
          return b
        }
        // create buttons in requested order
        const left = makeBtn('←', () => rotateCamera(1, 0))
        const right = makeBtn('→', () => rotateCamera(-1, 0))
        const up = makeBtn('↑', () => rotateCamera(0, 1))
        const down = makeBtn('↓', () => rotateCamera(0, -1))
        const plus = makeBtn('+', () => zoomCamera(-0.25))
        const minus = makeBtn('−', () => zoomCamera(0.25))

        controlsEl.appendChild(left)
        controlsEl.appendChild(right)
        controlsEl.appendChild(up)
        controlsEl.appendChild(down)
        controlsEl.appendChild(plus)
        controlsEl.appendChild(minus)
        mountRef.current.appendChild(controlsEl)

        // add press-and-hold behavior with short threshold so quick taps register as single clicks
        const attachHold = (el, actionFrame) => {
          let raf = null
          let lastT = null
          let held = false
          let timeoutId = null
          let pressed = false
          const holdDelay = 140 // ms before entering continuous mode

          const start = (ev) => {
            ev.preventDefault()
            pressed = true
            held = false
            // start a timeout; if it fires, begin continuous RAF-driven updates
            timeoutId = setTimeout(() => {
              if (!pressed) return
              held = true
              lastT = performance.now()
              const step = (t) => {
                const dt = (t - lastT) / 1000
                lastT = t
                actionFrame(dt)
                raf = requestAnimationFrame(step)
              }
              raf = requestAnimationFrame(step)
            }, holdDelay)
          }

          const stop = (ev) => {
            // only respond if this element received the initial press
            if (!pressed) return
            pressed = false
            if (timeoutId) { clearTimeout(timeoutId); timeoutId = null }
            if (raf) { cancelAnimationFrame(raf); raf = null }
            // if not held long enough, treat as a discrete click
            if (!held) {
              try { if (typeof el.__clickAction === 'function') el.__clickAction() } catch (e) {}
            }
            held = false
            lastT = null
          }

          el.addEventListener('mousedown', start)
          el.addEventListener('touchstart', start, { passive: false })
          el.addEventListener('mouseup', stop)
          el.addEventListener('mouseleave', stop)
          el.addEventListener('touchend', stop)
          el.addEventListener('touchcancel', stop)
          // store clear for cleanup
          el.__clearHold = () => { if (timeoutId) { clearTimeout(timeoutId); timeoutId = null } if (raf) { cancelAnimationFrame(raf); raf = null } }
        }

        // smoother, lower-rate actions for continuous hold
        const angSpeedLR = Math.PI / 3.6 // ~50 deg/sec for left/right
        const angSpeedUD = Math.PI / 9.0 // ~20 deg/sec for up/down (reduced)
        const zoomSpeed = 0.6 // world units per second

        attachHold(left, (dt) => rotateBy(angSpeedLR * dt, 0))
        attachHold(right, (dt) => rotateBy(-angSpeedLR * dt, 0))
        attachHold(up, (dt) => rotateBy(0, angSpeedUD * dt))
        attachHold(down, (dt) => rotateBy(0, -angSpeedUD * dt))
        // make plus zoom in (negative delta) and minus zoom out (positive delta)
        attachHold(plus, (dt) => zoomBy(-zoomSpeed * dt))
        attachHold(minus, (dt) => zoomBy(zoomSpeed * dt))

        // Attempt to load a PDB and render a protein backbone tube (no cylinder fallback)
        let caPositions = null
        let centroid = { x: 0, y: 0, z: 0 }
        let scaleFactor = 1
        if (modelUrl && typeof modelUrl === 'string' && modelUrl.toLowerCase().endsWith('.pdb')) {
          try {
            const resp = await fetch(modelUrl)
            if (!resp.ok) throw new Error('PDB fetch failed')
            const text = await resp.text()
            const lines = text.split(/\r?\n/)
            const cas = []
            for (const line of lines) {
              if (!(line.startsWith('ATOM') || line.startsWith('HETATM'))) continue
              const atomName = (line.substring(12, 16) || '').trim()
              if (atomName !== 'CA') continue
              const sx = line.substring(30, 38).trim()
              const sy = line.substring(38, 46).trim()
              const sz = line.substring(46, 54).trim()
              const resStr = (line.substring(22, 26) || '').trim()
              const resName = (line.substring(17, 20) || '').trim()
              const resNum = parseInt(resStr, 10)
              const x = parseFloat(sx)
              const y = parseFloat(sy)
              const z = parseFloat(sz)
              if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
                cas.push({ x, y, z, residue: Number.isFinite(resNum) ? resNum : null, resname: resName })
              }
            }

            if (cas.length === 0) throw new Error('No CA atoms found in PDB')

            caPositions = cas
            // compute centroid
            let cx = 0, cy = 0, cz = 0
            for (const p of cas) { cx += p.x; cy += p.y; cz += p.z }
            cx /= cas.length; cy /= cas.length; cz /= cas.length
            centroid = { x: cx, y: cy, z: cz }

            // build curve from centered positions
            const pts = cas.map(p => new THREE.Vector3(p.x - cx, p.y - cy, p.z - cz))
            const curve = new THREE.CatmullRomCurve3(pts)
            const tubularSegments = Math.max(128, pts.length * 4)
            const tubeGeom = new THREE.TubeGeometry(curve, tubularSegments, 0.08, 8, false)
            const tubeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.15, roughness: 0.6 })
            const tubeMesh = new THREE.Mesh(tubeGeom, tubeMat)

            // scale to fit a reasonable viewport size
            const bbox = new THREE.Box3().setFromObject(tubeMesh)
            const size = new THREE.Vector3(); bbox.getSize(size)
            const maxDim = Math.max(size.x, size.y, size.z, 1e-6)
            const desired = 2.2
            const s = desired / maxDim
            scaleFactor = s
            tubeMesh.scale.set(s, s, s)
            scene.add(tubeMesh)
            // add a directional light to give depth to the solid mesh
            const dir = new THREE.DirectionalLight(0xffffff, 0.8)
            dir.position.set(5, 5, 5)
            scene.add(dir)
            const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.35)
            scene.add(hemi)
          } catch (e) {
            console.warn('Channel3D: failed to load or parse PDB', e)
            if (mountRef.current) mountRef.current.innerHTML = '<div class="muted">Failed to load PDB model.</div>'
          }
        } else {
          if (mountRef.current) mountRef.current.innerHTML = '<div class="muted">No PDB model provided.</div>'
        }

        // Add a faint ambient light just in case
        const amb = new THREE.AmbientLight(0xffffff, 0.6)
        scene.add(amb)

        // Mutation marker (red dot)
        const markerGroup = new THREE.Group()
        scene.add(markerGroup)

        function setMarker(pos) {
          // clear previous
          markerGroup.clear()
          if (!pos) return
          const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0x440000, metalness: 0.3, roughness: 0.4 })
          )
          // If pos references a residue number, map to the parsed CA atom coordinate
          if (pos && typeof pos === 'object' && 'residue' in pos && caPositions && caPositions.length > 0) {
            const resNum = Number(pos.residue)
            // prefer exact residue number + name match when a name is provided
            let p = null
            if (pos.name) {
              p = caPositions.find(a => Number(a.residue) === resNum && a.resname === String(pos.name))
            }
            // find exact residue number if not found by name
            if (!p) p = caPositions.find(a => Number(a.residue) === resNum)
            // fallback: if not found use nearest index
            if (!p) {
              const idx = Math.max(0, Math.min(caPositions.length - 1, resNum - 1))
              p = caPositions[idx]
            }
            if (p) {
              const px = (p.x - centroid.x) * scaleFactor
              const py = (p.y - centroid.y) * scaleFactor
              const pz = (p.z - centroid.z) * scaleFactor
              sphere.position.set(px, py, pz)
              const markerScale = Math.max(2.0, (1.0 / Math.max(scaleFactor, 0.0001)) * 1.2)
              sphere.scale.set(markerScale, markerScale, markerScale)
            }
          } else if (pos && typeof pos === 'object' && 'x' in pos && 'y' in pos && 'z' in pos) {
            sphere.position.set(pos.x, pos.y, pos.z)
            sphere.scale.set(2.0, 2.0, 2.0)
          } else if (Array.isArray(pos) && pos.length >= 3) {
            sphere.position.set(pos[0], pos[1], pos[2])
            sphere.scale.set(2.0, 2.0, 2.0)
          }

          markerGroup.add(sphere)
        }

        // initial marker
        setMarker(mutationPosition)

        // Controls
        controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.07
        controls.enablePan = false
        controls.minDistance = 1.2
        controls.maxDistance = 8

        // Responsive resize handling
        function onWindowResize() {
          const w = mountRef.current.clientWidth || width
          const h = mountRef.current.clientHeight || height
          camera.aspect = w / Math.max(1, h)
          camera.updateProjectionMatrix()
          renderer.setSize(w, h)
        }

        window.addEventListener('resize', onWindowResize)

        // animate
        let rafId
        const animate = () => {
          controls.update()
          renderer.render(scene, camera)
          rafId = requestAnimationFrame(animate)
        }
        animate()

        // camera manipulation helpers used by the overlay buttons
        function rotateBy(angleLR = 0, angleUD = 0) {
          // angleLR/angleUD are radians (positive = left/up)
          if (controls.rotateLeft && typeof controls.rotateLeft === 'function') {
            if (angleLR !== 0) controls.rotateLeft(angleLR)
            if (angleUD !== 0) controls.rotateUp(angleUD)
          } else {
            // fallback: rotate camera position around controls.target
            const axisY = new THREE.Vector3(0, 1, 0)
            const camPos = camera.position.clone().sub(controls.target)
            camPos.applyAxisAngle(axisY, angleLR)
            // up/down rotate around camera right vector
            if (angleUD !== 0) {
              const rightAxis = new THREE.Vector3().crossVectors(camera.up, camPos).normalize()
              camPos.applyAxisAngle(rightAxis, angleUD)
            }
            camera.position.copy(controls.target.clone().add(camPos))
          }
          controls.update()
        }

        // convenience wrapper for discrete clicks (preserves previous semantics)
        function rotateCamera(directionLR = 0, directionUD = 0) {
          const step = Math.PI / 12 // 15 degrees per click
          rotateBy(directionLR * step, directionUD * step)
        }

        function zoomBy(delta) {
          // delta in world units
          const dir = controls.target.clone().sub(camera.position).normalize()
          camera.position.addScaledVector(dir, -delta)
          controls.update()
        }

        function zoomCamera(delta) {
          // keep backward-compatible discrete click behavior
          zoomBy(delta)
        }

        cleanupRef.current = () => {
          cancelAnimationFrame(rafId)
          window.removeEventListener('resize', onWindowResize)
          controls.dispose()
          renderer.dispose()
          // remove canvas
          if (mountRef.current && renderer.domElement) {
            try { mountRef.current.removeChild(renderer.domElement) } catch (e) {}
          }
          // remove controls overlay if present and clear hold timers
          try {
            const controlEls = mountRef.current.querySelectorAll('.' + (styles.controls || 'controls'))
            controlEls.forEach(container => {
              try {
                const buttons = container.querySelectorAll('button')
                buttons.forEach(b => { try { if (b.__clearHold) b.__clearHold() } catch (e) {} })
                mountRef.current.removeChild(container)
              } catch (e) {}
            })
          } catch (e) {}
        }

        // expose setter for later prop updates
        mountRef.current.__setMarker = setMarker
      } catch (e) {
        // three.js not installed or failed to load; mount a fallback message
        if (!mounted) return
        if (mountRef.current) {
          mountRef.current.innerHTML = '<div class="muted">3D viewer requires three.js. Run `npm install three`.</div>'
        }
      }
    }

    setup()

    return () => {
      mounted = false
      if (cleanupRef.current) cleanupRef.current()
    }
  }, [width, height])

  // update marker when mutationPosition prop changes
  useEffect(() => {
    if (mountRef.current && typeof mountRef.current.__setMarker === 'function') {
      mountRef.current.__setMarker(mutationPosition)
    }
  }, [mutationPosition])

  return (
    <div className={styles.wrap} style={{ width, height, background }}>
      <div ref={mountRef} className={styles.mount} />
    </div>
  )
}
