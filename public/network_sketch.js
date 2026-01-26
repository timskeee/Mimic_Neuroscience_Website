window.networkSketch = (p) => {
  let neurons = [];
  const NEURON_COUNT = 60; 
  const COLUMN_WIDTH = 190; 
  
  let waveY = 350;
  const WAVE_SPEED = 1.9;
  const WAVE_THICKNESS = 60;

  p.setup = () => {
    p.createCanvas(800, 900); 
    for (let i = 0; i < NEURON_COUNT; i++) {
      let angle = p.random(p.TWO_PI);
      let r = p.random(COLUMN_WIDTH);
      let x = r * p.cos(angle);
      let z = r * p.sin(angle);
      
      let layer = p.floor(p.random(2, 6)); 
      let layerY = p.map(layer, 1, 6, -320, 360) + p.random(-45, 45);
      
      let type = p.random(1) > 0.3 ? 'pyramidal' : 'interneuron';
      neurons.push(new Neuron(p, x, layerY, z, type, layer));
    }
  };

  p.draw = () => {
    p.background(0);
    p.translate(p.width / 2, p.height / 2); 

    let rotY = p.frameCount * 0.0032; 
    // travel top -> bottom by increasing waveY
    waveY += WAVE_SPEED;
    if (waveY > 450) waveY = -450;

    for (let n of neurons) {
      n.screenZ = n.pos.x * p.sin(rotY) + n.pos.z * p.cos(rotY);
    }
    neurons.sort((a, b) => a.screenZ - b.screenZ);

    for (let n of neurons) {
      n.display(rotY, waveY, WAVE_THICKNESS);
    }
  };

  class Neuron {
    constructor(p, x, y, z, type, layer) {
      this.p = p;
      this.pos = p.createVector(x, y, z);
      this.layer = layer;
      this.branches = [];
      this.spinY = p.random(p.TWO_PI);
      this.waveOffset = p.random(-35, 35);
      this.initMorphology(type);
    }

    initMorphology(type) {
      if (type === 'pyramidal') {
        // APICAL STALK (Stays vertical/polar)
        let stalkTargetY = -360 - this.pos.y; 
        this.growKinkedStalk(this.p.createVector(0,0,0), stalkTargetY * 0.7, 5);
        
        // BASAL DENDRITES (Now truly radial)
        for(let i=0; i<7; i++) {
          // Randomize starting direction in 3D (any direction from the soma)
          let startAngle = this.p.random(this.p.TWO_PI);
          // random direction allows some to go slightly up, sideways, or down
          let verticalDir = this.p.random(-0.5, 1.0); 
          this.growTree(this.p.createVector(0,0,0), startAngle, 3, verticalDir, 1.2);
        }
      } else {
        // INTERNEURONS (Fully isotropic/spherical)
        for(let i=0; i<10; i++) {
          this.growTree(this.p.createVector(0,0,0), this.p.random(this.p.TWO_PI), 3, this.p.random(-1, 1), 1.5);
        }
      }
    }

    growKinkedStalk(start, totalY, segments) {
      let currentPos = start.copy();
      let segY = totalY / segments;
      for (let i = 0; i < segments; i++) {
        let end = p5.Vector.add(currentPos, this.p.createVector(
          this.p.random(-18, 18), 
          segY + this.p.random(-5, 5), 
          this.p.random(-18, 18)
        ));
        this.branches.push({start: currentPos.copy(), end: end.copy()});
        currentPos = end;
      }
      // Top tuft stays reaching upward
      this.growTree(currentPos, -this.p.HALF_PI, 3, -1.0, 0.9);
    }

    // Updated verticalDir parameter to handle any direction rather than just binary Up/Down
    growTree(start, angle, depth, verticalDir, spread) {
      if (depth <= 0) return;
      
      let len = this.p.random(15, 45) * (depth * 0.48);
      
      let count = this.p.random(1) > 0.65 ? 3 : 2;
      for(let i=0; i<count; i++) {
        let nextAngle = angle + this.p.random(-spread, spread);
        let zTilt = this.p.random(-spread * 0.5, spread * 0.5);
        
        // Use verticalDir to determine Y movement (allows radial growth)
        let end = this.p.createVector(
          start.x + len * this.p.cos(nextAngle),
          start.y + (len * verticalDir) + this.p.random(-10, 10),
          start.z + len * this.p.sin(zTilt)
        );
        
        this.branches.push({start, end});
        // Pass a slightly jittered verticalDir to maintain general radial path
        this.growTree(end, nextAngle, depth - 1, verticalDir + this.p.random(-0.2, 0.2), spread);
      }
    }

    display(rotY, waveY, thickness) {
      this.p.push();
      let x1 = this.pos.x * this.p.cos(rotY) - this.pos.z * this.p.sin(rotY);
      this.p.translate(x1, this.pos.y);
      let totalSpin = rotY + this.spinY;

      let localWaveY = waveY + this.waveOffset;

      for (let b of this.branches) {
        let segmentY = this.pos.y + (b.start.y + b.end.y) / 2;
        let noiseVal = this.p.noise(this.pos.x*0.015, segmentY*0.015, this.p.frameCount*0.02) * 35;
        let dist = this.p.abs(segmentY - (localWaveY + noiseVal));

        if (dist < thickness) {
          let intensity = this.p.map(dist, 0, thickness, 255, 45);
          this.p.stroke(0, 165, 255, intensity);
          this.p.strokeWeight(1.9);
        } else {
          this.p.stroke(255, 255, 255, 32); 
          this.p.strokeWeight(0.85);
        }

        let sX = b.start.x * this.p.cos(totalSpin) - b.start.z * this.p.sin(totalSpin);
        let eX = b.end.x * this.p.cos(totalSpin) - b.end.z * this.p.sin(totalSpin);

        this.p.line(sX, b.start.y, eX, b.end.y);
      }
      this.p.pop();
    }
  }
};