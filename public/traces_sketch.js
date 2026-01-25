window.neuronSketch = (p) => {
  // ==========================================
  // --- CONTROL PANEL ---
  // ==========================================
  const ANIMATION_SPEED = 0.5;   // LOWER = Slower drawing; HIGHER = Faster drawing
  const TIME_WINDOW_MS  = 200;   // Always spans the full 1400px
  const CANVAS_WIDTH    = 1400;
  const CANVAS_HEIGHT   = 800;
  
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

  let cWhite = [179, 179, 179], cRed = [169, 40, 67], cBlue = [0, 161, 183], cAxis = [255, 255, 255, 100];

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
    p.background(0); 
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
      let active = (t > 10 && t < 190); 


      V1 = calculateHH(V1, n1, m1, h1, 120, gK_WT, active ? I_WT : 0, (res) => { V1=res.V; n1=res.n; m1=res.m; h1=res.h; });

      // Make the red/fast trace more excitable: continuous, stronger current pulse, and higher spike amplitude
      let fastActive = (t > 10 && t < 190);
      let I_FAST_EXCITABLE = 110; // much higher than I_WT
      let gNa_FAST_EXCITABLE = 145; // increase from 120 to 145 for taller spikes
      V2 = calculateHH(V2, n2, m2, h2, gNa_FAST_EXCITABLE, gK_FAST, fastActive ? I_FAST_EXCITABLE : 0, (res) => { V2=res.V; n2=res.n; m2=res.m; h2=res.h; });

      // For the blue/slow trace, give two pulses: 10-90ms and 110-190ms
      let slowActive = (t > 10 && t < 90) || (t > 110 && t < 190);
      V3 = calculateHH(V3, n3, m3, h3, 120, gK_SLOW, slowActive ? I_SLOW : 0, (res) => { V3=res.V; n3=res.n; m3=res.m; h3=res.h; });

      t += dt;
    }

    // --- 2. MAPPING ---
    let y1 = mapVoltage(p, V1, panel1Y, panelHeight);
    let y2 = mapVoltage(p, V2, panel2Y, panelHeight);
    let y3 = mapVoltage(p, V3, panel3Y, panelHeight);

    // Clear Footer
    p.fill(0); p.noStroke();
    p.rect(0, CANVAS_HEIGHT - 70, p.width, 70);

    // --- 3. DRAWING ---
    p.strokeWeight(2);
    p.stroke(...cWhite); p.line(prevX, prevY1, x, y1);
    p.stroke(...cRed);   p.line(prevX, prevY2, x, y2);
    p.stroke(...cBlue);  p.line(prevX, prevY3, x, y3);

    // Axis
    p.stroke(...cAxis);
    p.line(0, axisY, x, axisY);
    handleFadingLabels(p, x, t);

    // --- 4. ADVANCE & RESET ---
    prevX = x;
    prevY1 = y1; prevY2 = y2; prevY3 = y3;
    x = nextX; 

    if (x >= CANVAS_WIDTH) { 
      p.background(0);
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
    if (rounded >= 25 && rounded % 25 === 0 && (labels.length === 0 || labels[labels.length-1].val !== rounded)) {
      labels.push({ xPos: currentX, val: rounded, alpha: 0 });
    }
    for (let l of labels) {
      if (l.alpha < 255) l.alpha += 10; 
      p.stroke(255, l.alpha * 0.4);
      // Draw tick downward from axis line (at p.height - 40)
      p.line(l.xPos, p.height - 40, l.xPos, p.height - 35);
      p.noStroke(); p.fill(179, l.alpha);
      p.textAlign(p.CENTER); p.textSize(8);
      p.text(l.val , l.xPos, p.height - 15);
    }
  }
};
