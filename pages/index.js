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
      {/* <section
        className={`below-hero${showBelowHero ? ' reveal' : ''}`}
        style={{
          width: '100%',
          minHeight: '100vh',
          background: '#000',
          zIndex: 2,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          margin: 0,
          padding: 0,
          transition: 'opacity 0.6s cubic-bezier(.4,0,.2,1)',
        }}
      >
        <div className="actions">
          <Link href="/technology" className="btn">Our Technology</Link>
          <Link href="/people" className="btn btn-ghost">People</Link>
        </div>
        <div className="blurb">
          <h2>What we do</h2>
          <p>We develop simulation tools and analysis pipelines to better understand neuronal dynamics and computation.</p>
        </div>
      </section> */}
      {/* Second full-viewport section, SpaceX style */}

      <section className="second-section">
        <div className="neuron-blurb-row">
          <div className="neuron-right">
            <div className="blurb mission-blurb">
              <h2>Accelerating Neuroscience Discovery</h2>
              <p>
                <br></br>We simulate neurons to improve diagnostics and develop tools for drug makers to better accelerate preclinical research. 
                <br></br><br></br>Our computational models help decode neuronal behavior, enabling faster, more precise insights for both clinicians and pharmaceutical innovators.
              </p>
            </div>
          </div>
          <div className="neuron-left">
            <div id="neuron-container" style={{ width: '100%', height: 800 }} />
          </div>
        </div>
      </section>

      {/* Ion Channel Animation Section */}
      <section className="ion-channel-section">
        <div className="ion-channel-row">
          <div className="ion-channel-left">
            <div id="channel-container" style={{ width: 400, height: 400 }} />
          </div>
          <div className="ion-channel-right">
            <div className="blurb ion-channel-blurb">
              <h2>Ion Channel Animation</h2>
              <p>
                This animation demonstrates how ion channels open and close to allow ions to pass through the cell membrane. The gate in the center opens and closes, and ions (white dots) flow through when the channel is open, illustrating the fundamental mechanism of neuronal signaling.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamically load p5.js and both sketches only on client to avoid hydration errors */}
      {typeof window !== 'undefined' && <ClientP5Loader />}
    </>
  );
}

// Dynamically load p5.js and sketch.js only on client
function ClientP5Loader() {
  useEffect(() => {
    // 1. Check if the script already exists to prevent duplicates
    if (document.getElementById('p5-cdn')) return;

    const script = document.createElement('script');
    script.id = 'p5-cdn';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.0/p5.js';

    script.onload = () => {
      // Load traces sketch
      const tracesScript = document.createElement('script');
      tracesScript.src = '/traces_sketch.js';
      tracesScript.onload = () => {
        if (window.p5 && window.neuronSketch) {
          new window.p5(window.neuronSketch, 'neuron-container');
        }
        // Load ion channel sketch after traces sketch
        const ionScript = document.createElement('script');
        ionScript.src = '/ion_channel.js';
        ionScript.onload = () => {
          if (window.p5 && window.ionChannelSketch) {
            new window.p5(window.ionChannelSketch, 'channel-container');
          }
        };
        document.body.appendChild(ionScript);
      };
      document.body.appendChild(tracesScript);
    };

    document.body.appendChild(script);
  }, []);

  return null;
}
