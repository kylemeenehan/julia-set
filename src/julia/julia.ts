import p5 from "p5";
/* Written in p5.js (https://p5js.org/)
 * Under Creative Commons License
 * https://creativecommons.org/licenses/by-sa/4.0/
 * Written by Juan Carlos Ponce Campuzano, 28-Nov-2018
 */

// Last update 16/Mar/2024

let julia: JuliaSet;
let changeC: boolean; //Boolean to fix 'c'
let c: p5.Vector;
const WIDTH = 490;
const HEIGHT = 490;
const ctlsBack = 0; //This is just needed it when controls are inside canvas

let up = 1;
let down = 2;
let left = 3;
let right = 4;
let zoomin = 5;
let zoomout = 6;
let reset = 7;
let info = false;
let sliderIter: p5.Element;
let sizePlot = false;
let checkboxc;

let prevmx = 0;
let prevmy = 0;
let pmx = 0;
let pmy = 0;

function setup(p: p5) {
  p.createCanvas(WIDTH, HEIGHT);
  p.cursor("none");
  p.pixelDensity(1); //I need this for small devices

  julia = new JuliaSet();
  changeC = true;
  c = new p5.Vector(0, 0);

  p.frameRate(60);
  p.smooth();

  controlsUI();
}

function windowResized(p: p5) {
  if (sizePlot == true) {
    p.resizeCanvas(700, 700);
  } else {
    p.resizeCanvas(490, 490);
  }
}

function draw(p: p5) {
  p.background(200);

  julia.update();
  julia.plot();

  up = 1;
  down = 2;
  left = 3;
  right = 4;
  zoomin = 5;
  zoomout = 6;
  reset = 7;

  //console.log(up);
}

function keyReleased() {
  if (keyCode === 73) {
    //I key
    julia.printDebug = !julia.printDebug;
  }
  if (keyCode === 66) {
    //B key
    sizePlot = !sizePlot;
  }
  windowResized();
  if (keyCode === 13) {
    //Enter key
    changeC = !changeC;
  }
  if (keyCode === 83) {
    //S key
    saveFractal();
  }
}

function mouseWheel(e) {
  // Check if the mouse is inside the canvas
  if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    // Apply zoom only when the mouse is inside the canvas
    julia.zoomAt(mouseX, mouseY, 0.85, e.delta < 0);
  }
}

// KeyCodes available at: http://keycode.info/
const KC_UP = 38; // Move up W
const KC_DOWN = 40; // Move down S
const KC_LEFT = 37; // Move left A
const KC_RIGHT = 39; // Move right D
const KC_UNZOOM = 189; // Zoom back -
const KC_ZOOM = 187; // Zoom in +
const KC_RESET = 82; // Reset zoom level and position R
const KC_ITERPLUS = 190; // More Iterations >
const KC_ITERMINUS = 188; // Less Iteration <
const KC_FIXEC = 13; // Fix c Enter

class JuliaSet {
  private origSize: p5.Vector = new p5.Vector(3, 3);
  private size: p5.Vector = new p5.Vector(this.origSize.x, this.origSize.y);
  private originPosition: p5.Vector = new p5.Vector(0, 0);
  private pos: p5.Vector = new p5.Vector(this.originPosition.x, this.originPosition.y);
  private maxIterations = 150;
  private origZoom = 1;
  private zoom = this.origZoom;
  public printDebug = false;

  constructor() {}

  update(p: p5) {
    const moveSpeed = 0.1 * this.zoom;
    if (up === -1 || p.keyIsDown(KC_UP)) this.pos.y -= moveSpeed;
    if (down === -2 || p.keyIsDown(KC_DOWN)) this.pos.y += moveSpeed;
    if (left === -3 || p.keyIsDown(KC_LEFT)) this.pos.x -= moveSpeed;
    if (right === -4 || p.keyIsDown(KC_RIGHT)) this.pos.x += moveSpeed;
    if (zoomout === -6 || p.keyIsDown(KC_UNZOOM))
      this.zoomAt(width / 2, height / 2, 0.94, false);
    if (zoomin === -5 || p.keyIsDown(KC_ZOOM))
      this.zoomAt(width / 2, height / 2, 0.95, true);
    if (reset === -7 || p.keyIsDown(KC_RESET)) {
      this.size.x = this.origSize.x;
      this.size.y = this.origSize.y;
      this.pos.x = this.originPosition.x;
      this.pos.y = this.originPosition.y;
      this.zoom = this.origZoom;
    }

    /*const iteration = 5;
        if(keyIsDown(KC_ITERPLUS)){
            if(this.maxIter <=300){
                this.maxIter += iteration;
            }else this.maxIter = 300;
        }
        if(keyIsDown(KC_ITERMINUS)){
            if(this.maxIter > 0){
                this.maxIter -= iteration;
            }else this.maxIter = 0;
        }*/

    this.maxIterations = sliderIter.value();
  }

  zoomAt(x, y, ammount, isZoomIn) {
    ammount = isZoomIn ? ammount : 1 / ammount;
    x = map(
      x,
      0,
      width,
      this.pos.x - this.size.x / 2,
      this.pos.x + this.size.x / 2,
    );
    y = map(
      y,
      height,
      0,
      this.pos.y - this.size.y / 2,
      this.pos.y + this.size.y / 2,
    );
    this.pos.x = x + (this.pos.x - x) * ammount;
    this.pos.y = y + (this.pos.y - y) * ammount;
    this.zoom *= ammount;
    this.size.x = this.origSize.x * this.zoom;
    this.size.y = this.origSize.y * this.zoom;
  }

  plot(p: p5) {
    p.loadPixels();

    let mx = p.constrain(mouseX, 0, width);
    let my = p.constrain(mouseY, 0, height);
    let cX, cY;
    //I need this if/else so the fractal stops updating when mouse is outside the canvas
    if (
      changeC === true &&
      0 < mouseX &&
      mouseX < width &&
      0 < mouseY &&
      mouseY < height
    ) {
      cX = this.pos.x + p.map(mx, 0, width, -this.size.x / 2, this.size.x / 2); //this is for Julia
      cY = this.pos.y + p.map(my, height, 0, -this.size.y / 2, this.size.y / 2); //this is for Julia
      pmx = mx;
      pmy = my;
    } else {
      cX = -0.52; //this is for Julia
      cY = 0.53; //this is for Julia
    }

    if (changeC == true) {
      p.fill(255);
      p.noStroke();
      p.ellipse(mx, my, 8, 8);

      c = new p5.Vector(cX, cY);
    }

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const sqZ = new p5.Vector(0, 0);
        const z = new p5.Vector(
          this.pos.x + p.map(x, 0, width, -this.size.x / 2, this.size.x / 2),
          this.pos.y + p.map(y, height, 0, -this.size.y / 2, this.size.y / 2),
        );

        let iter = 0;
        while (iter < this.maxIterations) {
          sqZ.x = z.x * z.x - z.y * z.y;
          sqZ.y = 2 * z.x * z.y;
          z.x = sqZ.x + c.x;
          z.y = sqZ.y + c.y;
          if (p.abs(z.x + z.y) > 16) break;
          iter++;
        }
        setPixelHSV(
          x,
          y,
          p.map(iter, 0, this.maxIterations, 0, 1),
          1,
          iter !== this.maxIterations,
        );
      }
    }
    p.updatePixels();
    if (this.printDebug) {
      //Frame reference

      p.stroke(220);
      p.strokeWeight(2);
      p.line(width / 2, 0, width / 2, height);
      p.line(0, height / 2, width, height / 2);
      p.ellipse(width / 2, height / 2, 8, 8);

      p.fill(255);
      p.stroke(0);
      p.strokeWeight(3);
      p.textSize(24);

      p.text(
        "x: " +
          p.str(p.round(this.pos.x * 1000) / 1000) +
          "\ny: " +
          p.str(p.round(this.pos.y * 1000) / 1000) +
          "\nzoom: " +
          p.str(p.round((1 / this.zoom) * 1000) / 1000) +
          "\niterations: " +
          p.str(p.round(this.maxIterations * 1000) / 1000),
        5,
        19,
      );
    }
    //draw constant label
    p.fill(255);
    p.stroke(0);
    p.strokeWeight(3);
    p.textSize(24);
    if (
      (0 < mouseX && mouseX < width && 0 < mouseY && mouseY < height) ||
      changeC === false
    ) {
      if (!changeC) {
        p.cursor("crosshair");
      } else p.cursor("none");
      p.text(
        "c is (" +
          p.str(p.round(c.x * 1000) / 1000.0) +
          "," +
          p.str(p.round(c.y * 1000) / 1000.0) +
          ")",
        5,
        height - 15,
      );
    } else {
      p.text("c es (-0.52, 0.53)", 5, height - 15);
    }

    if (
      changeC === true &&
      0 < mouseX &&
      mouseX < width &&
      0 < mouseY &&
      mouseY < height
    ) {
      p.fill(255);
      p.strokeWeight(1);
      p.ellipse(mx, my, 8, 8);
      prevmx = mx;
      prevmy = my;
    } //else {
    //  fill(255);
    //  strokeWeight(3);
    //  ellipse(prevmx, prevmy, 8, 8);
    //}
  }
}

function setPixelRGB(x, y, r, g, b) {
  const pixelID = (x + y * width) * 4;
  pixels[pixelID + 0] = r;
  pixels[pixelID + 1] = g;
  pixels[pixelID + 2] = b;
  pixels[pixelID + 3] = 255;
}

function setPixelHSV(x, y, h, s, v) {
  let r, g, b, i, f, p, q, t;
  i = Math.floor(h * 6);
  f = h * 6 - i;
  p = v * (1 - s);
  q = v * (1 - f * s);
  t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0:
      ((r = v), (g = t), (b = p));
      break;
    case 1:
      ((r = q), (g = v), (b = p));
      break;
    case 2:
      ((r = p), (g = v), (b = t));
      break;
    case 3:
      ((r = p), (g = q), (b = v));
      break;
    case 4:
      ((r = t), (g = p), (b = v));
      break;
    case 5:
      ((r = v), (g = p), (b = q));
      break;
  }
  setPixelRGB(
    x,
    y,
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255),
  );
}

function controlsUI(p: p5) {
  document.getElementById("up").onclick = () => {
    up = -1;
  };
  document.getElementById("down").onclick = () => {
    down = -2;
  };
  document.getElementById("left").onclick = () => {
    left = -3;
  };
  document.getElementById("right").onclick = () => {
    right = -4;
  };
  document.getElementById("zoomin").onclick = () => {
    zoomin = -5;
  };
  document.getElementById("zoomout").onclick = () => {
    zoomout = -6;
  };
  document.getElementById("reset").onclick = () => {
    reset = -7;
  };
  document.getElementById("info").onclick = () => {
    userINFO();
  };
  document.getElementById("screen").onclick = () => {
    if (sizePlot) {
      sizePlot = false;
    } else {
      sizePlot = true;
    }
    p.windowResized();
  };
  document.getElementById("save").onclick = () => {
    saveFractal(p);
  };

  sliderIter = p.createSlider(0, 400, 150, 1);
  sliderIter.parent("slider");
  sliderIter.style("width", "120px");
}

function userINFO() {
  if (info) {
    info = false;
  } else {
    info = true;
  }
  julia.printDebug = !julia.printDebug;
}

function saveFractal(p: p5) {
  p.save("julia.jpg");
}
