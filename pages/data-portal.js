import { useEffect, useState } from 'react'
import MutationViewer from '../components/MutationViewer'
import SpikingPlot from '../components/SpikingPlot'
import styles from '../styles/dataPortal.module.css'

export default function DataPortal(){
  const [list, setList] = useState([])
  const [selected, setSelected] = useState('')
  const [mutation, setMutation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [drug, setDrug] = useState('none')
  const [wtId, setWtId] = useState(null)
  const [wtPreviewData, setWtPreviewData] = useState(null)
  const [showWT, setShowWT] = useState(true)

  // disable body/page scroll while on the data portal and restore on unmount
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow
    const prevDocOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    // mark document so global styles can target footer placement
    document.body.classList.add('data-portal-open')
    return () => {
      document.body.style.overflow = prevBodyOverflow
      document.documentElement.style.overflow = prevDocOverflow
      document.body.classList.remove('data-portal-open')
    }
  }, [])

  useEffect(()=>{
    fetch('/api/data-previews')
      .then(r=>r.ok ? r.json() : Promise.reject())
      .then(data => {
          setList(data)
          // default to WT if present
          const wt = data.find(x => /\bWT\b/i.test(x.name) || /\bwt\b/i.test(x.id))
          if (wt) {
            setWtId(wt.id)
            setSelected(wt.id)
            // if previewData already embedded, use it; otherwise fetch preview JSON
            if (wt.previewData) setWtPreviewData(wt.previewData)
            else {
              const src = wt.preview || `/data/${wt.id}.json`
              fetch(src).then(r => r.ok ? r.json() : Promise.reject()).then(j => setWtPreviewData(j)).catch(()=>{})
            }
          }
        })
      .catch(()=>setList([]))
  },[])

  useEffect(()=>{
    if(!selected){ setMutation(null); return }
    setLoading(true)
    // find preview entry for selected id
    const entry = list.find(x=>x.id === selected)
    const src = entry?.preview || `/data/${selected}.json`
    // if the list entry contains previewData (uploaded in-memory), use it directly
    if (entry && entry.previewData) {
      const j = entry.previewData
      const out = {
        id: selected,
        name: entry.name || j.metadata?.name || selected,
        gene: j.metadata?.gene || entry.metadata?.gene || '',
        summary: j.metadata?.summary || entry.summary || j.summary || '',
        parameters: j.metadata?.parameters || j.parameters || {},
        files: j.files || [],
        simulatedResults: j.simulatedResults || j.previewResults || [],
        previewData: j,
        preview: entry.preview || undefined
      }
      setMutation(out)
      setLoading(false)
      return
    }

    fetch(src)
      .then(r=> r.ok ? r.json() : Promise.reject())
      .then(j=> {
        // combine file metadata with parsed JSON
        const out = {
          id: selected,
          name: entry?.name || j.metadata?.name || selected,
          gene: j.metadata?.gene || entry?.metadata?.gene || '',
          summary: j.metadata?.summary || entry?.summary || j.summary || '',
          parameters: j.metadata?.parameters || j.parameters || {},
          files: j.files || [],
          simulatedResults: j.simulatedResults || j.previewResults || [],
          previewData: j,
          preview: src
        }
        setMutation(out)
      })
      .catch(()=> setMutation(null))
      .finally(()=> setLoading(false))
  },[selected, list])

  return (
    <main className={styles.portalPage}> 
      <div className={styles.layoutGrid}>
        <aside className={styles.leftPanel} aria-label="Controls">
          <div className={styles.title}>Mutation Viewer</div>
          <div className="muted">Choose a mutation and treatment to inspect parameters and quick simulation outputs.</div>

          <div className={styles.controlGroup} style={{marginTop:18}}>
            <label htmlFor="mut-select">Mutation</label>
            <select id="mut-select" className={styles.select} value={selected} onChange={e=> setSelected(e.target.value)}>
              <option value="">— Select mutation —</option>
              {list.map(m=> <option key={m.id} value={m.id}>{m.name} — {m.gene}</option>)}
            </select>
          </div>

          {selected && wtId && selected !== wtId && (
            <div style={{marginTop:12}}>
              <button type="button" className={`btn ${showWT ? '' : 'ghost'}`} onClick={()=> setShowWT(s=>!s)}>
                {showWT ? 'Hide WT' : 'Show WT'}
              </button>
            </div>
          )}

          

          <div className={styles.controlGroup}>
            <label htmlFor="drug-select">Drug treatment</label>
            <select id="drug-select" className={styles.select} value={drug} onChange={e=> setDrug(e.target.value)}>
              <option value="none">None</option>
              <option value="drugA">Drug A (blocker)</option>
              <option value="drugB">Drug B (modulator)</option>
            </select>
          </div>

          <div className={styles.btnRow}>
            <button type="button" className="btn" onClick={()=>{/* placeholder: run simulation */}}>Run simulation</button>
            <button type="button" className="btn ghost" onClick={()=>{ setSelected(''); setMutation(null); setDrug('none') }}>Reset</button>
          </div>
        </aside>

        <section className={styles.mainPanel}>
          <div className={styles.viewerWrap}>
            {loading && <div className="muted">Loading mutation...</div>}
            <MutationViewer mutation={mutation} />
            {/* Example spiking plot (uses precomputed preview JSON) */}
            <div style={{marginTop:18}}>
              {(() => {
                // determine base and overlay data depending on WT toggle and selection
                let baseData = mutation?.previewData || null
                let overlay = null
                if (selected && wtId && selected !== wtId) {
                  // a mutant is selected
                  if (showWT && wtPreviewData) {
                    baseData = wtPreviewData
                    overlay = mutation?.previewData || null
                  } else {
                    baseData = mutation?.previewData || null
                    overlay = null
                  }
                }
                return <SpikingPlot data={baseData} compareData={overlay} showCompare={Boolean(overlay)} compareColor="#ff3b3b" height={360} width={760} />
              })()}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
