window.neuronSketch = (p) => {
  // --- Color Variables ---
  let wtTraceColor = [200, 200, 200];      
  let mutTraceColor = [255, 0, 0];       
  let timeAxisColor = [255, 255, 255, 100]; 

  let V_wt = -70, n_wt = 0.3177, m_wt = 0.0529, h_wt = 0.5961; 
  let prevY_wt = 0;

  let V_mut = -70, n_mut = 0.3177, m_mut = 0.0529, h_mut = 0.5961;
  let prevY_mut = 0;
  
  // Visibility Threshold: Shows up after roughly 3-4 white spikes
  let xThreshold = 60; 

  let dt = 0.05, t = 0;     
  let x = 0, prevX = 0; 
  let I = 0; 
  let labels = [];

  // --- STIMULUS KNOBS ---
  let stimStart = 20;   
  let stimTime  = 800;  
  let stimAmp   = 15;   // Increased amplitude to force more activity
  let stimEnd   = stimStart + stimTime;

  // --- CONDUCTANCE KNOBS (Hyper-Excited Red) ---
  const gNa_wt = 120;  
  const gNa_mut = 400; // EXTREME excitability for the red trace

  p.setup = () => {
    p.createCanvas(1400, 600);
    p.background(0); 
    p.textFont('monospace');
    prevY_wt = p.map(V_wt, -100, 50, p.height - 60, 0);
    prevY_mut = p.map(V_mut, -100, 50, p.height - 60, 0);
  };

  p.draw = () => {
    I = (t > stimStart && t < stimEnd) ? stimAmp : 0;

    for (let i = 0; i < 2; i++) {
      // WT HH Integration
      let res_wt = calculateHH(V_wt, m_wt, h_wt, n_wt, gNa_wt, I);
      V_wt = res_wt.V; m_wt = res_wt.m; h_wt = res_wt.h; n_wt = res_wt.n;

      // Red HH Integration
      let res_mut = calculateHH(V_mut, m_mut, h_mut, n_mut, gNa_mut, I);
      V_mut = res_mut.V; m_mut = res_mut.m; h_mut = res_mut.h; n_mut = res_mut.n;
      t += dt;
    }

    let y_wt = p.map(V_wt, -100, 50, p.height - 60, 0);
    let y_mut = p.map(V_mut, -100, 50, p.height - 60, 0);

    // Clear UI strip
    p.fill(0);
    p.noStroke();
    p.rect(0, p.height - 50, p.width, 50); 

    // 1. Draw WHITE Trace
    p.stroke(...wtTraceColor);
    p.strokeWeight(1.5);
    p.line(prevX, prevY_wt, x, y_wt);

    // 2. Draw RED Trace (With slight vertical offset to ensure visibility)
    if (x > xThreshold) {
      p.stroke(...mutTraceColor);
      p.strokeWeight(2.5); 
      // Offset by +2 pixels so it isn't perfectly hidden by the white line
      p.line(prevX, prevY_mut + 2, x, y_mut + 2);
    }

    // 3. UI Elements
    p.stroke(...timeAxisColor);
    p.strokeWeight(2);
    p.line(0, p.height - 30, x, p.height - 30);
    handleFadingLabels(p, x, t);

    prevX = x;
    prevY_wt = y_wt;
    prevY_mut = y_mut;
    x += 0.5;

    if (x > p.width) {
      x = 0; prevX = 0; t = 0;
      V_wt = -70; n_wt = 0.3177; m_wt = 0.0529; h_wt = 0.5961;
      V_mut = -70; n_mut = 0.3177; m_mut = 0.0529; h_mut = 0.5961;
      labels = []; 
      p.background(0);
      prevY_wt = p.map(V_wt, -100, 50, p.height - 60, 0);
      prevY_mut = p.map(V_mut, -100, 50, p.height - 60, 0);
    }
  };

  function calculateHH(V, m, h, n, gNa, currentI) {
    const ENa = 50, EK = -77, EL = -54.4; 
    const gK = 36, gL = 0.3;   
    let an = 0.01 * (V + 55) / (1 - Math.exp(-(V + 55) / 10));
    let bn = 0.125 * Math.exp(-(V + 65) / 80);
    let am = 0.1 * (V + 40) / (1 - Math.exp(-(V + 40) / 10));
    let bm = 4 * Math.exp(-(V + 65) / 18);
    let ah = 0.07 * Math.exp(-(V + 65) / 20);
    let bh = 1 / (1 + Math.exp(-(V + 35) / 10));
    n += dt * (an * (1 - n) - bn * n);
    m += dt * (am * (1 - m) - bm * m);
    h += dt * (ah * (1 - h) - bh * h);
    let INa = gNa * Math.pow(m, 3) * h * (V - ENa);
    let IK = gK * Math.pow(n, 4) * (V - EK);
    let IL = gL * (V - EL);
    V += dt * (currentI - INa - IK - IL);
    return { V, m, h, n };
  }

  function handleFadingLabels(p, currentX, currentTime) {
    if (Math.floor(currentTime) % 20 === 0 && Math.floor(currentTime) !== Math.floor(currentTime - 0.1)) {
      labels.push({ xPos: currentX, val: Math.floor(currentTime), alpha: 0, isText: true });
    }
    for (let l of labels) {
      if (l.alpha < 255) l.alpha += 5; 
      p.textAlign(p.CENTER);
      p.stroke(255, l.alpha * 0.4);
      p.line(l.xPos, p.height - 30, l.xPos, p.height - 35);
      p.noStroke();
      p.fill(255, l.alpha);
      p.textSize(9);
      p.text(l.val, l.xPos, p.height - 12);
    }
  }
};