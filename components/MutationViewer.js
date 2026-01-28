import React from 'react'
import styles from '../styles/dataPortal.module.css'

function Sparkline({ data = [], width = 220, height = 40 }){
  if(!data || data.length === 0) return <svg className={styles.spark} width={width} height={height} />
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const step = width / (data.length - 1)
  const points = data.map((v,i)=> `${i*step},${height - ((v - min)/range)*height}`).join(' ')
  return <svg className={styles.spark} width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none"><polyline fill="none" stroke="var(--accent)" strokeWidth="2" points={points} strokeLinecap="round" strokeLinejoin="round"/></svg>
}

export default function MutationViewer({ mutation }){
  if(!mutation) return <div className={styles.viewerEmpty}>Select a mutation to view details</div>
  return (
    <div className={styles.viewer} key={mutation.id} aria-live="polite">
      <div className={styles.viewerHeader}>
        <div>
          <h2 className={styles.mutName}>{mutation.name}</h2>
          <div className={styles.mutMeta}>{mutation.gene}</div>
        </div>
        <div className={styles.sparkWrap}><Sparkline data={mutation.simulatedResults} /></div>
      </div>

      <p className={styles.summary}>{mutation.summary}</p>

      <div className={styles.block}>
        <strong>Parameters</strong>
        <pre className={styles.params}>{JSON.stringify(mutation.parameters, null, 2)}</pre>
      </div>

      <div className={styles.block}>
        <strong>Files</strong>
        {Array.isArray(mutation.files) && mutation.files.length > 0 ? (
          <ul>
            {mutation.files.map(f=> <li key={f}><a href={`/${f}`} target="_blank" rel="noreferrer">{f}</a></li>)}
          </ul>
        ) : (
          <div className={styles.muted}>No source files available for this preview.</div>
        )}
      </div>
    </div>
  )
}
