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
              <h2>Accelerating Neuroscience Discovery</h2>
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
        <div className="content-row">
          <div className="content-visual-side">
            <div id="channel-container" className="canvas-wrapper-small" />
          </div>
          <div className="content-text-side">
            <div className="mission-blurb">
              <h2>Precision Simulations for Better Medicine.</h2>
              <p>
                We model ion channel kinetics to streamline drug discovery and unlock deeper diagnostic insights through high-fidelity digital twins of the cellular membrane.
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
              <h2>Multiplying Neuron Network</h2>
              <p>
                This immersive 3D animation visualizes a dynamic network of neurons inside a virtual cylinder. 
                Pulses travel along branching dendrites, simulating the complexity and beauty of neural computation. 
                Rotate and zoom to explore the network in 3D.
              </p>
            </div>
          </div>
          <div className="content-visual-side">
            <div id="network-canvas-container" className="canvas-wrapper-network" />
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <p>&copy; 2026 Mimic Neuroscience. All rights reserved.</p>
      </footer>

      {/* Dynamically load p5.js and sketches */}
      {typeof window !== 'undefined' && <ClientP5Loader />}
    </>
  );
}

function ClientP5Loader() {
  useEffect(() => {
    if (document.getElementById('p5-cdn')) return;

    const script = document.createElement('script');
    script.id = 'p5-cdn';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.0/p5.js';

    script.onload = () => {
      const tracesScript = document.createElement('script');
      tracesScript.src = '/traces_sketch.js';
      tracesScript.onload = () => {
        if (window.p5 && window.neuronSketch) {
          new window.p5(window.neuronSketch, 'neuron-container');
        }
        const ionScript = document.createElement('script');
        ionScript.src = '/ion_channel_sketch.js';
        ionScript.onload = () => {
          if (window.p5 && window.ionChannelSketch) {
            new window.p5(window.ionChannelSketch, 'channel-container');
          }
          const networkScript = document.createElement('script');
          networkScript.src = '/network_sketch.js';
          networkScript.onload = () => {
            if (window.p5 && window.networkSketch) {
              new window.p5(window.networkSketch, 'network-canvas-container');
            }
          };
          document.body.appendChild(networkScript);
        };
        document.body.appendChild(ionScript);
      };
      document.body.appendChild(tracesScript);
    };

    document.body.appendChild(script);
  }, []);

  return null;
}