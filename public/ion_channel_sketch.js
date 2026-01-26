window.ionChannelSketch = (p) => {
  let cloudIons = [];    
  let transitIons = [];  
  
  const CLOUD_SIZE = 800; 
  const TRANSIT_SPEED = 4.5; 
  const BOTTOM_DECAY = 0.003; 
  
  const outerWidth = 120; 
  const innerWidthMax = 42; 
  const channelHeight = 130;
  
  //Channel Colors
  const OUTER_STRUCT_COLOR = [180, 180, 180,200];
  const PORE_COLOR = [245, 245, 250];
  const MEMBRANE_COLOR = [179, 179, 179,120];

  const ION_COLOR = [180, 180, 255, 200];    
  const ION_FADE = [180, 180, 255, 150];     
  // Single constant to control drawn ion size (use this to tweak sizes)
  const ION_SIZE = 4;
  
  let gateState = 0; 
  let isOpening = false;

  p.setup = () => {
    p.createCanvas(600, 600);
    for (let i = 0; i < CLOUD_SIZE; i++) {
      cloudIons.push(new CloudIon(p));
    }
  };

  p.draw = () => {
    p.background(0);
    let midX = p.width / 2;
    let midY = p.height / 2;
    let topLimit = midY - channelHeight/2;
    let botLimit = midY + channelHeight/2;

    if (p.frameCount % 100 === 0) isOpening = !isOpening;
    
    let lerpSpeed = isOpening ? 0.07 : 0.03; 
    gateState = p.lerp(gateState, isOpening ? 1 : 0, lerpSpeed); 

    // --- LAYER 1: TRANSIT & BOTTOM (Drawn first, behind everything) ---
    for (let i = transitIons.length - 1; i >= 0; i--) {
      let ion = transitIons[i];
      ion.update(midX, midY, channelHeight/2);
      ion.display();
      if (ion.currY > p.height + 50 || (ion.isPassed && p.random() < BOTTOM_DECAY)) {
        transitIons.splice(i, 1);
      }
    }

    // --- LAYER 2: CHANNEL & MEMBRANE (Drawn second) ---
    p.noFill();

    let currentPore = p.max(4, gateState * innerWidthMax);

    // Membrane Horizontal Lines (draw first in this layer)
    p.strokeWeight(1.2);
    p.stroke(...MEMBRANE_COLOR);
    p.line(0, midY, midX - outerWidth/2, midY);
    p.line(midX + outerWidth/2, midY, p.width, midY);
    // Second (sub-)membrane for a dual-layered look
    const membraneOffset = -20; // pixels below main membrane
    // use identical stroke and weight for the secondary line
    p.strokeWeight(1.2);
    p.stroke(...MEMBRANE_COLOR);
    p.line(0, midY + membraneOffset, midX - outerWidth/2, midY + membraneOffset);
    p.line(midX + outerWidth/2, midY + membraneOffset, p.width, midY + membraneOffset);

    // Outer Protein Structure (scaffold)
    p.strokeWeight(1.5);
    p.stroke(...OUTER_STRUCT_COLOR);
    p.ellipse(midX, topLimit, outerWidth, 30);
    p.ellipse(midX, botLimit, outerWidth, 30);
    p.line(midX - outerWidth/2, topLimit, midX - outerWidth/2, botLimit);
    p.line(midX + outerWidth/2, topLimit, midX + outerWidth/2, botLimit);

    // Inner Pore Cylinder (use separate pore color)
    p.stroke(...PORE_COLOR);
    p.ellipse(midX, topLimit, currentPore, 10 * p.max(0.2, gateState)); 
    p.ellipse(midX, botLimit, currentPore, 10 * p.max(0.2, gateState));
    p.line(midX - currentPore/2, topLimit, midX - currentPore/2, botLimit);
    p.line(midX + currentPore/2, topLimit, midX + currentPore/2, botLimit);

    // --- LAYER 3: TOP CLOUD (Drawn last, highest Z-axis/Foreground) ---
    p.push();
    // ensure clouds composite on top for stronger 3D look
    if (p.drawingContext && p.drawingContext.globalCompositeOperation) {
      p.drawingContext.globalCompositeOperation = 'lighter';
    }
    for (let ion of cloudIons) {
      ion.update(midX, topLimit, currentPore, gateState);
      ion.display();
      if (ion.captured) {
        transitIons.push(new TransitIon(p, ion.currX, ion.currY));
        ion.reset(); 
      }
    }
    // restore drawing state
    if (p.drawingContext && p.drawingContext.globalCompositeOperation) {
      p.drawingContext.globalCompositeOperation = 'source-over';
    }
    p.pop();
  };

  class CloudIon {
    constructor(p) {
      this.p = p;
      this.reset(true);
    }
    reset(initial = false) {
      this.currX = this.p.random(0, this.p.width);
      this.currY = initial ? this.p.random(0, 220) : this.p.random(0, 50);
      this.noiseX = this.p.random(1000);
      this.noiseY = this.p.random(1000);
      this.captured = false;
    }
    update(mx, myLimit, gap, gState) {
      if (this.currX < 0) this.currX = this.p.width;
      if (this.currX > this.p.width) this.currX = 0;
      if (this.currY < 0) this.currY = myLimit - 10; 
      
      this.currX += (this.p.noise(this.noiseX) - 0.5) * 2.5;
      this.currY += (this.p.noise(this.noiseY) - 0.5) * 2.5;
      this.noiseX += 0.007;
      this.noiseY += 0.007;

      // allow cloud ions to slightly overlap into the channel area
      if (this.currY > myLimit + 6) this.currY = myLimit + 6;
      if (gState > 0.4) {
        let d = this.p.dist(this.currX, this.currY, mx, myLimit);
        if (d < 85) this.captured = true; 
      }
    }
    display() {
      this.p.noStroke();
      // stronger alpha and slightly larger for visibility over the channel
      this.p.fill(...ION_COLOR);
      this.p.ellipse(this.currX, this.currY, ION_SIZE, ION_SIZE);
    }
  }

  class TransitIon {
    constructor(p, x, y) {
      this.p = p;
      this.currX = x;
      this.currY = y;
      this.isPassed = false;
      this.isAligned = false; 
      this.exitVelX = this.p.random(-5, 5);
      this.noiseX = this.p.random(1000);
      this.noiseY = this.p.random(1000);
    }
    update(mx, my, halfH) {
      let topOfPore = my - halfH;
      if (!this.isPassed) {
        if (!this.isAligned) {
          this.currX = this.p.lerp(this.currX, mx, 0.2);
          if (Math.abs(this.currX - mx) < 2) this.isAligned = true;
        } 
        if (this.isAligned) {
          this.currY += 4.5;
          this.currX = mx; 
        } else {
          this.currY = this.p.lerp(this.currY, topOfPore, 0.1);
        }
        if (this.currY > my + halfH) this.isPassed = true;
      } else {
        this.currX += (this.p.noise(this.noiseX) - 0.5) * 1.6 + this.exitVelX;
        this.currY += (this.p.noise(this.noiseY) - 0.5) * 1.6 + 0.4;
        this.exitVelX *= 0.96;
        this.noiseX += 0.005;
        this.noiseY += 0.005;
        if (this.currY < my + halfH + 10) this.currY = my + halfH + 10;
      }
    }
    display() {
      this.p.noStroke();
      // Use the same ion colors and a matching size to keep visual
      // consistency between cloud ions and transit ions.
      const fillColor = this.isPassed ? ION_FADE : ION_COLOR;
      this.p.fill(...fillColor);
      this.p.ellipse(this.currX, this.currY, ION_SIZE, ION_SIZE);
    }
  }
};