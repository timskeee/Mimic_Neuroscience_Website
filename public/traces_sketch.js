window.neuronSketch = (p) => {
  // ==========================================
  // --- CONTROL PANEL ---
  // ==========================================
  const ANIMATION_SPEED = 0.90;   // LOWER = Slower drawing; HIGHER = Faster drawing
  const TIME_WINDOW_MS  = 200;   // Always spans the full 1400px
  const CANVAS_WIDTH    = 800;
  const CANVAS_HEIGHT   = 800;

  // --- Stimulus timing (ms, relative to simulation time t) ---
  // You can now control the overall stimulus duration with a single
  // value `STIM_DURATION_MS`. The code will split it into two slow
  // pulses with a small gap between them. Change `STIM_DURATION_MS`
  // to make the stimulus window shorter or longer.
  const STIM_START_MS = 10;                  // when stimulation begins
  const STIM_DURATION_MS = 170;              // total stimulus duration (ms)
  const SLOW_PULSE_GAP_MS = 20;              // gap between the two slow pulses (kept small)
  // Derive slow pulse duration and end time from the single total duration
  const SLOW_PULSE_DURATION_MS = Math.max(1, Math.floor((STIM_DURATION_MS - SLOW_PULSE_GAP_MS) / 2));
  const STIM_END_MS = STIM_START_MS + STIM_DURATION_MS;
  
  // Excitability (Input Current Amps)
  let I_WT   = 10;  
  let I_FAST = 70;  
  let I_SLOW = 14;  
  
  let gK_WT   = 36;
  let gK_FAST = 36;
  let gK_SLOW = 52; 
  // ==========================================

  const panelHeight = 260; // spike height stays the same
  const panelSpacing = 200; // slightly closer, but not squished
  const panelYOffset = 100; // move all traces down by 250px
  const panel1Y = panelYOffset;
  const panel2Y = panel1Y + panelSpacing;
  const panel3Y = panel2Y + panelSpacing;
  const axisY   = CANVAS_HEIGHT - 40;

  let cWhite = [179, 179, 179], cRed = [169, 40, 67], cBlue = [0, 161, 183], cAxis = [120, 120, 120, 60];

  let V1=-70, n1=0.3177, m1=0.0529, h1=0.5961; 
  let V2=-70, n2=0.3177, m2=0.0529, h2=0.5961; 
  let V3=-70, n3=0.3177, m3=0.0529, h3=0.5961; 

  let prevY1, prevY2, prevY3;
  let x = 0, prevX = 0, t = 0;     
  
  // We calculate exactly how much simulation time passes per pixel
  const msPerPixel = TIME_WINDOW_MS / CANVAS_WIDTH;
  const dt = 0.01; // Tiny math step for high stability

  p.setup = () => {
    p.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    p.clear();
    p.textFont('monospace');
    prevY1 = mapVoltage(p, -70, panel1Y, panelHeight);
    prevY2 = mapVoltage(p, -70, panel2Y, panelHeight);
    prevY3 = mapVoltage(p, -70, panel3Y, panelHeight);
  };

  p.draw = () => {
    // Determine target time for this frame based on current x
    let nextX = x + ANIMATION_SPEED;
    let targetT = nextX * msPerPixel;

    // --- 1. PHYSICS LOOP ---
    // Instead of fixed loops, we calculate enough math to reach the next X position
    while (t < targetT && x < CANVAS_WIDTH) {
      let active = (t > STIM_START_MS && t < STIM_END_MS);


      V1 = calculateHH(V1, n1, m1, h1, 120, gK_WT, active ? I_WT : 0, (res) => { V1=res.V; n1=res.n; m1=res.m; h1=res.h; });

      // Make the red/fast trace more excitable: continuous, stronger current pulse, and higher spike amplitude
      let fastActive = (t > STIM_START_MS && t < STIM_END_MS);
      let I_FAST_EXCITABLE = 110; // much higher than I_WT
      let gNa_FAST_EXCITABLE = 145; // increase from 120 to 145 for taller spikes
      V2 = calculateHH(V2, n2, m2, h2, gNa_FAST_EXCITABLE, gK_FAST, fastActive ? I_FAST_EXCITABLE : 0, (res) => { V2=res.V; n2=res.n; m2=res.m; h2=res.h; });

      // For the blue/slow trace, give two pulses: 10-90ms and 110-190ms
      let slowActive = (
        (t > STIM_START_MS && t < STIM_START_MS + SLOW_PULSE_DURATION_MS) ||
        (t > STIM_START_MS + SLOW_PULSE_DURATION_MS + SLOW_PULSE_GAP_MS && t < STIM_END_MS)
      );
      V3 = calculateHH(V3, n3, m3, h3, 120, gK_SLOW, slowActive ? I_SLOW : 0, (res) => { V3=res.V; n3=res.n; m3=res.m; h3=res.h; });

      t += dt;
    }

    // --- 2. MAPPING ---
    let y1 = mapVoltage(p, V1, panel1Y, panelHeight);
    let y2 = mapVoltage(p, V2, panel2Y, panelHeight);
    let y3 = mapVoltage(p, V3, panel3Y, panelHeight);

    // Footer is transparent now (no background rectangle)

    // --- 3. DRAWING ---
    p.strokeWeight(2);
    p.stroke(...cWhite); p.line(prevX, prevY1, x, y1);
    p.stroke(...cRed);   p.line(prevX, prevY2, x, y2);
    p.stroke(...cBlue);  p.line(prevX, prevY3, x, y3);

    // Axis (use rounded x to avoid sub-pixel antialias flicker)
    p.stroke(...cAxis);
    const axisX = Math.round(x);
    p.line(0, axisY, axisX, axisY);
    handleFadingLabels(p, x, t);

    // --- 4. ADVANCE & RESET ---
    prevX = x;
    prevY1 = y1; prevY2 = y2; prevY3 = y3;
    x = nextX; 

    if (x >= CANVAS_WIDTH) { 
      p.clear();
      x = 0; prevX = 0; t = 0;
      V1=-70; V2=-70; V3=-70;
      n1=0.3177; m1=0.0529; h1=0.5961;
      n2=0.3177; m2=0.0529; h2=0.5961;
      n3=0.3177; m3=0.0529; h3=0.5961;
      labels = [];
      prevY1 = mapVoltage(p, -70, panel1Y, panelHeight);
      prevY2 = mapVoltage(p, -70, panel2Y, panelHeight);
      prevY3 = mapVoltage(p, -70, panel3Y, panelHeight);
    }
  };

  function mapVoltage(p, V, offset, h) {
    return p.map(V, -100, 50, offset + h - 30, offset + 30);
  }

  function calculateHH(V, n, m, h, gNa, gK, I, update) {
    const ENa = 50, EK = -77, EL = -54.4, gL = 0.3;   
    let an = 0.01 * (V + 55) / (1 - Math.exp(-(V + 55) / 10));
    let bn = 0.125 * Math.exp(-(V + 65) / 80);
    let am = 0.1 * (V + 40) / (1 - Math.exp(-(V + 40) / 10));
    let bm = 4 * Math.exp(-(V + 65) / 18);
    let ah = 0.07 * Math.exp(-(V + 65) / 20);
    let bh = 1 / (1 + Math.exp(-(V + 35) / 10));
    n += dt * (an * (1 - n) - bn * n);
    m += dt * (am * (1 - m) - bm * m);
    h += dt * (ah * (1 - h) - bh * h);
    V += dt * (I - (gNa*Math.pow(m,3)*h*(V-ENa)) - (gK*Math.pow(n,4)*(V-EK)) - (gL*(V-EL)));
    update({V, n, m, h});
    return V;
  }

  let labels = [];
  function handleFadingLabels(p, currentX, currentTime) {
    // Only show labels for multiples of 25, starting at 25 (not 0)
    let rounded = Math.floor(currentTime);
    if (rounded >= 20 && rounded % 20 === 0 && (labels.length === 0 || labels[labels.length-1].val !== rounded)) {
      labels.push({ xPos: currentX, val: rounded, alpha: 0 });
    }
    for (let l of labels) {
      if (l.alpha < 255) l.alpha += 10; 
      // compute effective alpha for ticks/text using cAxis base alpha (if present)
      const baseAxisAlpha = (Array.isArray(cAxis) && cAxis.length > 3) ? cAxis[3] : 255;
      const effectiveAlpha = Math.round(baseAxisAlpha * (l.alpha / 255));
      // Draw tick downward from axis line (at p.height - 40) using axis color
      const tickX = Math.round(l.xPos);
      p.stroke(cAxis[0], cAxis[1], cAxis[2], effectiveAlpha);
      p.line(tickX, p.height - 40, tickX, p.height - 35);
      p.noStroke();
      p.fill(cAxis[0], cAxis[1], cAxis[2], effectiveAlpha);
      p.textAlign(p.CENTER); p.textSize(8);
      p.text(l.val , tickX, p.height - 15);
    }
  }
};
