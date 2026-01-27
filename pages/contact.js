import Link from 'next/link'
import { useState } from 'react'
import styles from '../styles/contact.module.css'

export default function Contact() {
  const [status, setStatus] = useState(null)

  function handleSubmit(e) {
    e.preventDefault()
    // temporary demo behavior
    setStatus('Sending…')
    setTimeout(() => setStatus('Demo: message captured (not actually sent).'), 700)
  }

  return (
    <main className={styles.contactPage}>
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <h1>Contact</h1>
          <p className={styles.lead}>Reach out about collaborations, partnerships, or demos.</p>
          <p className={styles.sub}>Temporary contact data included — you can replace anytime.</p>
        </div>
      </header>

      <section className={styles.container}>
        <div className={styles.formWrap}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <label>
              <span>Name</span>
              <input name="name" placeholder="Your name" required />
            </label>

            <label>
              <span>Email</span>
              <input name="email" type="email" placeholder="you@company.com" required />
            </label>

            <label>
              <span>Message</span>
              <textarea name="message" rows="6" placeholder="Tell us about your project" required />
            </label>

            <div className={styles.formActions}>
              <button className="btn" type="submit">Send Message</button>
              <div className={styles.status}>{status}</div>
            </div>
          </form>
        </div>

        <aside className={styles.infoCard}>
          <h3>Mimic Neuroscience</h3>
          <p className={styles.muted}>Temporary office</p>
          <p>123 Simulation Way<br/>San Francisco, CA 94107</p>

          <h4>Contact</h4>
          <p>
            <strong>Email:</strong> <a href="mailto:hello@mock-mimic.ai">hello@mock-mimic.ai</a><br/>
            <strong>Phone:</strong> (415) 555-0123
          </p>

          <h4>Hours</h4>
          <p>Mon–Fri, 9:00 — 17:00 PT</p>

          <h4>Follow</h4>
          <p className={styles.socials}>
            <a href="#">Twitter</a>
            <a href="#">LinkedIn</a>
            <a href="#">GitHub</a>
          </p>

          <div className={styles.mapPlaceholder}>Map placeholder</div>

          <p className={styles.small}>Prefer privacy? Email us and request data deletion — we'll respond promptly.</p>
        </aside>
      </section>

      <footer className={styles.contactFooter}>
        <Link href="/">← Back home</Link>
      </footer>
    </main>
  )
}

