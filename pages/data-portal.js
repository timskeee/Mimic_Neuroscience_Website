import { useEffect, useState } from 'react'
import MutationViewer from '../components/MutationViewer'
import styles from '../styles/dataPortal.module.css'

export default function DataPortal(){
  const [list, setList] = useState([])
  const [selected, setSelected] = useState('')
  const [mutation, setMutation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [drug, setDrug] = useState('none')

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
    fetch('/api/mutations')
      .then(r=>r.json())
      .then(data => setList(data))
      .catch(()=>setList([]))
  },[])

  useEffect(()=>{
    if(!selected){ setMutation(null); return }
    setLoading(true)
    fetch(`/api/mutations?id=${selected}`)
      .then(r=> r.ok ? r.json() : Promise.reject())
      .then(m=> setMutation(m))
      .catch(()=> setMutation(null))
      .finally(()=> setLoading(false))
  },[selected])

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
          </div>
        </section>
      </div>
    </main>
  )
}
