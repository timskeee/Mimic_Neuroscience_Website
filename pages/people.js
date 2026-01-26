import { useState } from 'react'
import styles from './people.module.css'

const MEMBERS = [
  {
    name: 'Dr. Alice Neural',
    title: 'Founder, Lead Researcher',
    bio: 'Alice leads the research team, focusing on bridging ion-channel dynamics with large-scale brain models. She holds a PhD in computational neuroscience.'
  },
  {
    name: 'Dr. Bob Spike',
    title: 'Senior Scientist',
    bio: 'Bob develops the electrophysiology toolchain and builds the experiments that drive our validation efforts.'
  }
]

const ADVISORS = [
  { name: 'Dr. Carol Cortex', title: 'Advisor', bio: 'Expert in cortical microcircuits and in vivo imaging.' },
  { name: 'Dr. Dan Dendrite', title: 'Advisor', bio: 'Specialist in dendritic computation and synaptic plasticity.' },
  { name: 'Dr. Eve Synapse', title: 'Advisor', bio: 'Leads translational neurotechnology initiatives.' },
  { name: 'Dr. Frank Axon', title: 'Advisor', bio: 'Neural systems modeler with a focus on scalable simulations.' },
  { name: 'Dr. Grace Glia', title: 'Advisor', bio: 'Glial signaling and neuromodulation researcher.' }
]

function PersonCard({ person, onOpen, onOpenFrom }){
  const initials = person.name.split(' ').map(n=>n[0]).slice(0,2).join('')
  return (
    <button className={styles.card} onClick={() => onOpen(person)} aria-label={`Open bio for ${person.name}`}>
      <div className={styles.avatar} aria-hidden onClick={(e)=>{ e.stopPropagation(); if(onOpenFrom) onOpenFrom(person, e.currentTarget); }}>
        <div className={styles.avatarInner}>{initials}</div>
      </div>
      <div className={styles.meta}>
        <div className={styles.name}>{person.name}</div>
        <div className={styles.title}>{person.title}</div>
      </div>
    </button>
  )
}

export default function People(){
  const [active, setActive] = useState(null)
  const [popRect, setPopRect] = useState(null)
  const [popExpanded, setPopExpanded] = useState(false)
  const [popClosing, setPopClosing] = useState(false)

  function open(person){
    setPopRect(null)
    setPopExpanded(false)
    setActive(person)
  }

  function openFrom(person, avatarEl){
    const rect = avatarEl.getBoundingClientRect()
    setPopClosing(false)
    setPopRect(rect)
    setActive(person)
    // expand on next frame
    requestAnimationFrame(()=> setPopExpanded(true))
  }

  function close(){
    if(popRect && popExpanded){
      // trigger sleek closing animation (fade+scale) instead of reversing to avatar
      setPopClosing(true)
      // allow animation to run then fully remove
      setTimeout(()=>{
        setPopExpanded(false)
        setPopClosing(false)
        setActive(null)
        setPopRect(null)
      }, 260)
    } else {
      setActive(null)
      setPopRect(null)
      setPopExpanded(false)
      setPopClosing(false)
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>People</h1>
        <p className="muted">A small, focused team with a broad advisory board. Click a face to read a short bio.</p>
      </header>

      <section>
        <h2 className={styles.sectionTitle}>Core Team</h2>
        <div className={styles.grid}>
          {MEMBERS.map(m => (
            <PersonCard key={m.name} person={m} onOpen={open} onOpenFrom={openFrom} />
          ))}
        </div>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Advisors</h2>
        <div className={styles.gridSmall}>
          {ADVISORS.map(a => (
            <PersonCard key={a.name} person={a} onOpen={open} onOpenFrom={openFrom} />
          ))}
        </div>
      </section>
      {/* pop animation when opening from avatar */}
      {active && popRect && (
        <div className={styles.modalBackdrop} onClick={close}>
          <div
            className={`${styles.pop}${popExpanded? ' '+styles.expanded : ''}${popClosing ? ' '+styles.closing : ''}`}
            style={popExpanded ? { left: '50%', top: '50%', width: 'min(720px, 92vw)', height: 'auto', transform: 'translate(-50%, -50%)' } : { left: popRect.left + 'px', top: popRect.top + 'px', width: popRect.width + 'px', height: popRect.height + 'px' }}
            onClick={(e)=>e.stopPropagation()}
          >
            <div className={styles.popContent}>
              <div className={styles.modalBody}>
                <div className={styles.modalAvatar}>{active.name.split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
                <div>
                  <h3 id="modal-title">{active.name}</h3>
                  <p className="muted">{active.title}</p>
                  <p>{active.bio}</p>
                </div>
              </div>
              <button className={styles.closeBtn} onClick={close} aria-label="Close">×</button>
            </div>
          </div>
        </div>
      )}

      {/* fallback modal when opened not from avatar (e.g., clicking card) */}
      {active && !popRect && (
        <div className={styles.modalBackdrop} onClick={close}>
          <div className={styles.modal} role="dialog" aria-labelledby="modal-title" onClick={(e)=>e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={close} aria-label="Close">×</button>
            <div className={styles.modalBody}>
              <div className={styles.modalAvatar}>{active.name.split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
              <h3 id="modal-title">{active.name}</h3>
              <p className="muted">{active.title}</p>
              <p>{active.bio}</p>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
