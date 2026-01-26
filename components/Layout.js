

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuAnimating, setMenuAnimating] = useState(false)
  const dropdownRef = useRef(null)

  // Handles menu close with animation
  const closeMenu = () => {
    setMenuAnimating(true)
    setTimeout(() => {
      setMenuOpen(false)
      setMenuAnimating(false)
    }, 320)
  }

  // Handles link click: close menu after navigation
  const handleLinkClick = () => {
    closeMenu()
  }

  // Click-away logic
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        closeMenu();
      }
    }
    if (menuOpen || menuAnimating) {
      document.addEventListener('mousedown', handleClick);
      return () => {
        document.removeEventListener('mousedown', handleClick);
      };
    }
  }, [menuOpen, menuAnimating]);

  return (
    <div className="app">
      <div className="hamburger-menu">
        <button
          className="hamburger-btn"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => {
            if (menuOpen) {
              closeMenu()
            } else {
              setMenuOpen(true)
            }
          }}
        >
          <span className={menuOpen || menuAnimating ? 'hamburger active' : 'hamburger'}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
      </div>

      {(menuOpen || menuAnimating) && (
        <div
          ref={dropdownRef}
          className={`dropdown-menu${menuOpen && !menuAnimating ? ' dropdown-animate-in' : ''}${menuAnimating ? ' dropdown-animate-out' : ''}`}
        >
          <Link href="/" onClick={handleLinkClick} className="dropdown-brand">
            <span>Mimic Neuroscience</span>
            <img src="/images/logo_white.png" alt="Mimic Neuroscience logo" className="brand-logo" />
          </Link>
          <nav>
            <Link href="/technology" onClick={handleLinkClick}>Technology</Link>
            <Link href="/people" onClick={handleLinkClick}>People</Link>
            <Link href="/contact" onClick={handleLinkClick}>Contact</Link>
          </nav>
        </div>
      )}

      <div className="content">{children}</div>
      <footer className="site-footer">© {new Date().getFullYear()} Mimic Neuroscience</footer>
    </div>
  )
}
