import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function Home() {
  const [showBelowHero, setShowBelowHero] = useState(false)
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    function handleScroll() {
      setScrollY(window.scrollY);
      setShowBelowHero(window.scrollY > 0);
    }
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [])

  return (
    <>
      {/* --- HERO SECTION --- */}
      <section className="full-bleed-hero">
        <video
          src="/videos/neuron_sync_movie.mp4"
          className="full-bleed-video"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
        />
        <div className="hero-center">
          <img src="/images/logo_white_large.png" alt="Mimic Neuroscience logo" className="brand-logo" />
          <h1>Mimic Neuroscience</h1>
          <p className="tag">Simulating the future of neuroscience.</p>
        </div>
      </section>

      {/* --- 1. NEUROSCIENCE DISCOVERY SECTION (Text Left, Animation Right) --- */}
      <section className="content-section">
        <div className="content-row">
          <div className="content-text-side">
            <div className="mission-blurb">
              <h2>Accelerating Neuroscience Discovery.</h2>
              <p>
                We simulate neurons to improve diagnostics and develop tools for drug makers to better accelerate preclinical research. 
                <br /><br />
                Our computational models help decode neuronal behavior, enabling faster, more precise insights for both clinicians and pharmaceutical innovators.
              </p>
            </div>
          </div>
          <div className="content-visual-side">
            <div id="neuron-container" className="canvas-wrapper" />
          </div>
        </div>
      </section>

      {/* --- 2. ION CHANNEL SECTION (Animation Left, Text Right) --- */}
      <section className="content-section">
        {/* add row--visual-left so CSS can flip which column the visual/text occupy */}
        <div className="content-row row--visual-left">
          <div className="content-visual-side">
            <div id="channel-container" className="canvas-wrapper-small" />
          </div>
          <div className="content-text-side">
            <div className="mission-blurb">
              <h2>Precision Simulations for Better Medicine.</h2>
              <p>
                We model ion channels to streamline drug discovery and unlock deeper diagnostic insights through high-fidelity digital twins.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- 3. NETWORK ANIMATION SECTION (Text Left, Animation Right) --- */}
      <section className="content-section">
        <div className="content-row">
          <div className="content-text-side">
            <div className="mission-blurb">
              <h2>Neural Circuits, Reimagined.</h2>
              <p>
                Simulations of neural circuits reveal how collective dynamics produce computation.
                Large-scale models lead us closer to whole-brain function.
                
              </p>
            </div>
          </div>
          <div className="content-visual-side">
            <div id="network-canvas-container" className="canvas-wrapper-network" />
          </div>
        </div>
      </section>

      {/* Footer rendered by components/Layout.js - remove duplicate here */}

      {/* Dynamically load p5.js and sketches */}
      {typeof window !== 'undefined' && <ClientP5Loader />}
    </>
  );
}

function ClientP5Loader() {
  useEffect(() => {
    let instances = {};

    const loadScript = (src, id) => new Promise((resolve, reject) => {
      const existing = id ? document.getElementById(id) : null;
      if (existing && (existing.getAttribute('data-loaded') === '1' || window.p5)) {
        return resolve(existing);
      }
      if (existing && existing.getAttribute('data-loading') === '1') {
        existing.addEventListener('load', () => resolve(existing));
        return;
      }
      const s = document.createElement('script');
      if (id) s.id = id;
      s.src = src;
      s.async = false;
      s.setAttribute('data-loading', '1');
      s.onload = () => { s.setAttribute('data-loaded', '1'); s.removeAttribute('data-loading'); resolve(s); };
      s.onerror = reject;
      document.body.appendChild(s);
    });

    const ensureSketch = (sketchName, containerId) => {
      const container = document.getElementById(containerId);
      if (!container) return;
      const existingCanvases = container.querySelectorAll('canvas');
      existingCanvases.forEach(c => c.remove());
      try {
        if (window.p5 && window[sketchName]) {
          instances[containerId] = new window.p5(window[sketchName], containerId);
        }
      } catch (e) {
        console.warn('p5 init failed for', sketchName, e);
      }
    };

    async function initAll() {
      if (!window.p5) {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.0/p5.js', 'p5-cdn');
      }
      await loadScript('/traces_sketch.js', 'traces-sketch');
      await loadScript('/ion_channel_sketch.js', 'ion-sketch');
      await loadScript('/network_sketch.js', 'network-sketch');

      ensureSketch('neuronSketch', 'neuron-container');
      ensureSketch('ionChannelSketch', 'channel-container');
      ensureSketch('networkSketch', 'network-canvas-container');
    }

    initAll().catch(err => console.error('Failed to initialize p5 sketches', err));

    return () => {
      Object.values(instances).forEach(inst => {
        try { inst.remove(); } catch (e) {}
      });
      instances = {};
    };
  }, []);

  return null;
}