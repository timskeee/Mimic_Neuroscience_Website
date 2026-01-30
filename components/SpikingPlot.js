import React, { useEffect, useRef, useState } from 'react'
import styles from '../styles/spikingPlot.module.css'

export default function SpikingPlot({ src = '/data/sim1.json', width = 900, height = 260, data: propData = null, compareData = null, showCompare = true, compareColor = '#ff3b3b' }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const containerRef = useRef()
  const overlayTimer = useRef()
  const [overlayPathState, setOverlayPathState] = useState(null)
  const [overlaySpikesState, setOverlaySpikesState] = useState([])
  const [overlayVisible, setOverlayVisible] = useState(false)
  const [displayedBaseData, setDisplayedBaseData] = useState(null)
  const pendingBaseRef = useRef(null)

  useEffect(() => {
    let mounted = true
    if (propData) {
      setData(propData)
      return () => { mounted = false }
    }
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error('network')
        return r.json()
      })
      .then((j) => mounted && setData(j))
      .catch((e) => mounted && setError(e))
    return () => (mounted = false)
  }, [src, propData])

  // keep displayed base data stable while overlays are fading
  useEffect(() => {
    if (!data) return
    // If a compare is being shown (adding overlay), apply the new base immediately
    if (showCompare && compareData) {
      setDisplayedBaseData(data)
      pendingBaseRef.current = null
      return
    }

    // If overlay is currently fading out, defer swapping base until fade completes
    if (overlayPathState || (overlaySpikesState && overlaySpikesState.length)) {
      pendingBaseRef.current = data
    } else {
      setDisplayedBaseData(data)
      pendingBaseRef.current = null
    }
  }, [data, overlayPathState, overlaySpikesState, compareData, showCompare])

  // manage overlay fade-in/out when compareData changes
  useEffect(() => {
    // clear any pending timer
    if (overlayTimer.current) {
      clearTimeout(overlayTimer.current)
      overlayTimer.current = null
    }

    // only consider trace/raster overlay when compareData provided and data available
    if (!data) return

    // compute overlay path & spikes independently of render code so we can animate
    let newCompPath = null
    let newOverlaySpikes = []

    if (showCompare && compareData) {
      if (compareData.times && compareData.voltages && data.times && data.voltages) {
        const rawTimes = data.times
        const maxRaw = Math.max(...rawTimes)
        const times = maxRaw > 50 ? rawTimes.map(t => t / 1000) : rawTimes
        const voltages = data.voltages
        const w = Math.max(200, width)
        const h = height
        const pad = { l: 48, r: 12, t: 12, b: 44 }
        const iw = w - pad.l - pad.r
        const ih = h - pad.t - pad.b
        const rct = compareData.times
        const maxCt = Math.max(...rct)
        const compTimes = maxCt > 50 ? rct.map(t => t / 1000) : rct
        const compVoltages = compareData.voltages
        const t0 = Math.min(times[0], compTimes[0])
        const t1 = Math.max(times[times.length - 1], compTimes[compTimes.length - 1])
        const x = (t) => pad.l + ((t - t0) / Math.max(1e-12, t1 - t0)) * iw
        const y = (v) => pad.t + (1 - (v - (-90)) / (60 - (-90))) * ih
        newCompPath = compVoltages.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(compTimes[i]).toFixed(2)} ${y(v).toFixed(2)}`).join(' ')
      }

      if (compareData.spikes || Array.isArray(compareData)) {
        const carr = Array.isArray(compareData) ? compareData : compareData.spikes || []
        const maxC = carr.reduce((m, s) => Math.max(m, (s && s.time) || 0), 0)
        newOverlaySpikes = maxC > 50 ? carr.map(s => ({ ...s, time: (s.time || 0) / 1000 })) : carr
      }
    }

    if (newCompPath) {
      // set data to render and fade in
      setOverlayPathState(newCompPath)
      setOverlaySpikesState(newOverlaySpikes)
      // ensure mount then set visible
      requestAnimationFrame(() => requestAnimationFrame(() => setOverlayVisible(true)))
    } else {
      // fade out existing overlay if present
      if (overlayPathState || overlaySpikesState.length) {
        setOverlayVisible(false)
        overlayTimer.current = setTimeout(() => {
          setOverlayPathState(null)
          setOverlaySpikesState([])
          // if a base change was deferred while overlay was visible, apply it now
          if (pendingBaseRef.current) {
            setDisplayedBaseData(pendingBaseRef.current)
            pendingBaseRef.current = null
          }
        }, 260)
      }
    }

    return () => {
      if (overlayTimer.current) clearTimeout(overlayTimer.current)
    }
  }, [compareData, showCompare, data, width, height])

  if (error) return <div className={styles.msg}>Failed to load data</div>
  if (!data) return <div className={styles.msg}>Loading…</div>

  // If data looks like a voltage trace (times + voltages), render a trace.
  if ((displayedBaseData || data).times && (displayedBaseData || data).voltages) {
    const srcBase = displayedBaseData || data
    const rawTimes = srcBase.times
    // auto-detect units: if times appear to be in milliseconds (large values), convert to seconds
    const maxRaw = Math.max(...rawTimes)
    // if times exceed 50, assume units are milliseconds and convert to seconds
    const times = maxRaw > 50 ? rawTimes.map(t => t / 1000) : rawTimes
    const voltages = srcBase.voltages
    // optionally prepare compare data (e.g., mutant) for overlay
    let compTimes = null
    let compVoltages = null
    if (showCompare && compareData && compareData.times && compareData.voltages) {
      const rct = compareData.times
      const maxCt = Math.max(...rct)
      compTimes = maxCt > 50 ? rct.map(t => t / 1000) : rct
      compVoltages = compareData.voltages
    }
    const w = Math.max(200, width)
    const h = height
    // give extra bottom room so Time label doesn't overlap tick labels
    const pad = { l: 48, r: 12, t: 12, b: 44 }
    const iw = w - pad.l - pad.r
    const ih = h - pad.t - pad.b

    // set time domain to union of primary and compare (if present)
    const t0 = Math.min(times[0], compTimes ? compTimes[0] : times[0])
    const t1 = Math.max(times[times.length - 1], compTimes ? compTimes[compTimes.length - 1] : times[times.length - 1])
    // use fixed y-axis range per request: -90 .. +60 mV
    const yMin = -90
    const yMax = 60
    const step = 20

    const x = (t) => pad.l + ((t - t0) / Math.max(1e-12, t1 - t0)) * iw
    const y = (v) => pad.t + (1 - (v - yMin) / (yMax - yMin)) * ih

    const path = voltages.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(times[i]).toFixed(2)} ${y(v).toFixed(2)}`).join(' ')
    const compPath = compTimes && compVoltages ? compVoltages.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(compTimes[i]).toFixed(2)} ${y(v).toFixed(2)}`).join(' ') : null

    // use fixed 200 ms tick spacing for x-axis
    const stepSec = 0.2
    const xticks = []
    // start tick at nearest lower multiple of step (but not negative)
    const startTick = Math.max(0, Math.floor(t0 / stepSec) * stepSec)
    for (let tt = startTick; tt <= t1 + 1e-9; tt += stepSec) {
      const rawX = x(tt)
      const labelX = Math.min(Math.max(rawX, pad.l + 6), w - pad.r - 6)
      xticks.push({ t: tt, x: rawX, labelX, label: Math.round(tt * 1000) })
    }

    const yticks = []
    for (let v = yMin; v <= yMax + 0.0001; v += step) {
      yticks.push({ v, y: y(v), label: Math.round(v) })
    }

    return (
      <div className={styles.plotWrap} ref={containerRef} style={{ width: '100%', maxWidth: w }}>
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" className={styles.plot}>
          <rect x={0} y={0} width={w} height={h} fill="transparent" />

          <line x1={pad.l} x2={pad.l} y1={pad.t} y2={h - pad.b} stroke="#1b2933" strokeWidth={1.5} />
          {yticks.map((tk, idx) => (
            <g key={idx}>
              <line x1={pad.l} x2={w - pad.r} y1={tk.y} y2={tk.y} stroke="#1b2933" strokeWidth={1} />
              <text x={pad.l - 8} y={tk.y + 4} className={styles.axisLabel} textAnchor="end">{tk.label}</text>
            </g>
          ))}

                {/* Draw either: (a) WT as light gray + mutant in red (when compare present), or (b) mutation only in red */}
                {(() => {
                  // base is WT when an overlay is present (either path or spikes) or when compareData is set
                  const baseIsWT = Boolean(overlayPathState || (overlaySpikesState && overlaySpikesState.length) || (showCompare && compareData))
                  const baseStroke = baseIsWT ? '#e6e6e6' : compareColor
                  const baseWidth = baseIsWT ? 1.2 : 1.8
                  return <path d={path} fill="none" stroke={baseStroke} strokeWidth={baseWidth} strokeLinecap="round" strokeLinejoin="round" />
                })()}
                {overlayPathState && (
                  <path d={overlayPathState} fill="none" stroke={compareColor} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={`${styles.overlay} ${overlayVisible ? styles.overlayVisible : ''}`} />
                )}

          {xticks.map((tk, idx) => (
            <g key={idx}>
              <line x1={tk.x} x2={tk.x} y1={h - pad.b} y2={h - pad.b + 6} stroke="#29404a" />
              <text x={tk.labelX} y={h - pad.b + 12} className={styles.axisLabel} textAnchor="middle">{tk.label}</text>
            </g>
          ))}

                {/* Y axis title: rotated CCW 90deg, left of plot, aligned near bottom */}
                <text transform={`rotate(-90 ${pad.l - 36} ${h - pad.b - 20})`} x={pad.l - 36} y={h - pad.b - 20} className={styles.axisTitle} textAnchor="middle">Voltage (mV)</text>
                {/* Time label: moved left to sit closer to the 'V' in Voltage */}
                <text x={pad.l - 24} y={h - pad.b + 34} className={styles.axisTitle} textAnchor="start">Time (ms)</text>
        </svg>
      </div>
    )
  }

  // Otherwise, treat as spike/raster data
  const baseForRaster = displayedBaseData || data
  const spikeArrayRaw = Array.isArray(baseForRaster) ? baseForRaster : baseForRaster.spikes || []
  // copy & convert spike times if they appear to be in milliseconds
  const maxSpikeTime = spikeArrayRaw.reduce((m, s) => Math.max(m, (s && s.time) || 0), 0)
  const spikeArray = maxSpikeTime > 50 ? spikeArrayRaw.map(s => ({ ...s, time: (s.time || 0) / 1000 })) : spikeArrayRaw
  
  const neurons = data.neurons || (spikeArray.reduce((m, s) => Math.max(m, s.neuron || 0), 0) + 1) || 1
  const duration = (data.duration || (spikeArray.reduce((m, s) => Math.max(m, s.time || 0), 0) || 1))

  // add extra bottom room so x-axis labels and Time title don't overlap
  const pad = { top: 8, right: 10, bottom: 44, left: 44 }
  const innerW = Math.max(10, width - pad.left - pad.right)
  const innerH = Math.max(10, height - pad.top - pad.bottom)

  const xFor = (t) => pad.left + (t / duration) * innerW
  const yFor = (n) => pad.top + ((n / Math.max(1, neurons - 1)) * innerH)

  // raster x-axis ticks at 200 ms increments
  const ticks = []
  const rStep = 0.2
  const rStart = 0
  for (let tt = rStart; tt <= duration + 1e-9; tt += rStep) {
    const rawX = pad.left + (tt / Math.max(1e-12, duration)) * innerW
    const labelX = Math.min(Math.max(rawX, pad.left + 6), width - pad.right - 6)
    ticks.push({ v: tt, x: rawX, labelX })
  }

  return (
    <div className={styles.container}>
      <svg width={width} height={height} className={styles.svg} role="img" aria-label="Spiking raster">
        <rect x="0" y="0" width={width} height={height} className={styles.background} />

        <g className={styles.xaxis}>
          {ticks.map((tk, idx) => (
            <g key={idx}>
              <line x1={tk.x} x2={tk.x} y1={height - pad.bottom} y2={height - pad.bottom + 6} stroke="#29404a" />
              <text x={tk.labelX} y={height - pad.bottom + 12} className={styles.axisLabel} textAnchor="middle">{Math.round(tk.v * 1000)}</text>
            </g>
          ))}

          {/* Axis titles: Voltage vertical, Time horizontal (centered) */}
          <text transform={`rotate(-90 ${pad.left - 36} ${pad.top + innerH / 2 - 20})`} x={pad.left - 36} y={pad.top + innerH / 2 - 20} className={styles.axisTitle} textAnchor="middle">Voltage (mV)</text>
          <text x={pad.left - 24} y={height - pad.bottom + 34} className={styles.axisTitle} textAnchor="start">Time (s)</text>

        </g>

        <g className={styles.rows}>
          {Array.from({ length: neurons }).map((_, i) => (
            <line
              key={i}
              x1={pad.left}
              x2={pad.left + innerW}
              y1={yFor(i)}
              y2={yFor(i)}
              stroke={i % 5 === 0 ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.03)'}
            />
          ))}
        </g>

        {/* draw base spikes first (WT or mutation), then overlay spikes when compare provided */}
        <g className={styles.spikes}>
          {(() => {
            // base is WT when an overlay is present (either path or spikes) or when compareData is set
            const hasOverlay = Boolean(overlayPathState || (overlaySpikesState && overlaySpikesState.length) || (showCompare && compareData))
            const baseColor = hasOverlay ? '#e6e6e6' : compareColor
            return spikeArray.map((s, i) => {
              const cx = xFor(s.time || 0)
              const cy = yFor(s.neuron || 0)
              return <line key={`b-${i}`} x1={cx} x2={cx} y1={cy - 3} y2={cy + 3} stroke={baseColor} strokeWidth={1} />
            })
          })()}
          {overlaySpikesState && (
            <g className={`${styles.overlay} ${overlayVisible ? styles.overlayVisible : ''}`}>
              {overlaySpikesState.map((s, i) => {
                const cx = xFor(s.time || 0)
                const cy = yFor(s.neuron || 0)
                return <line key={`o-${i}`} x1={cx} x2={cx} y1={cy - 3} y2={cy + 3} stroke={compareColor} strokeWidth={1.2} />
              })}
            </g>
          )}
        </g>
      </svg>
    </div>
  )
}
