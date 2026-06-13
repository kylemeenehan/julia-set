import { useRef } from "react";
import "./App.css";
import styled from "@emotion/styled";
import { drawScene, type ProgramInfo } from "./draw-scene";
import { initBuffers } from "./init-buffers";

type Vec = {
  x: number;
  y: number;
};

const Canvas = styled.canvas`
  width: 100%;
  height: 100%;
`;

const ButtonContainer = styled.div`
  position: fixed;
  bottom: 10px;
  left: 10px;
  display: flex;
  gap: 5px;
`;

const Button = styled.button`
  position: fixed;
  bottom: 10px;
  left: 10px;
`;

const x = 0.1;
const y = 0.5;
const maxIterations = 150;
const origSize: Vec = { x: 3, y: 3 };
const size: Vec = { x: origSize.x, y: origSize.y };
const originPosition: Vec = { x: 0, y: 0 };
const pos: Vec = { x: originPosition.x, y: originPosition.y };
// const c = new p5.Vector(0, 0);
const c: Vec = { x: -0.742, y: 0.163 };

function constrain(n: number, low: number, high: number): number {
  return Math.max(Math.min(n, high), low);
}

/**
 * Scales a number from one range to another.
 *
 * Replacement for p5.js map
 */
function scale(
  value: number,
  fromRangeStart: number,
  fromRangeEnd: number,
  toRangeStart: number,
  toRangeEnd: number,
  withinBounds?: boolean,
): number {
  const newval =
    ((value - fromRangeStart) / (fromRangeEnd - fromRangeStart)) *
      (toRangeEnd - toRangeStart) +
    toRangeStart;

  if (!withinBounds) {
    return newval;
  }
  if (toRangeStart < toRangeEnd) {
    return constrain(newval, toRangeStart, toRangeEnd);
  } else {
    return constrain(newval, toRangeEnd, toRangeStart);
  }
}

function setPixelRGB({
  x,
  y,
  width,
  r,
  g,
  b,
  pixels,
}: {
  x: number;
  y: number;
  width: number;
  r: number;
  g: number;
  b: number;
  pixels: ImageDataArray;
}) {
  const pixelID = (x + y * width) * 4;
  pixels[pixelID + 0] = r;
  pixels[pixelID + 1] = g;
  pixels[pixelID + 2] = b;
  pixels[pixelID + 3] = 255;
}

function getRGBFromHSV({
  h,
  s,
  v,
}: {
  h: number;
  s: number;
  v: number;
}): [number, number, number] {
  if (v === 0) {
    return [0, 0, 0];
  }

  let r = 0;
  let g = 0;
  let b = 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    case 5:
      r = v;
      g = p;
      b = q;
      break;
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function getIterationCount({
  x,
  y,
  width,
  height,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
}): number {
  const z: Vec = {
    x: pos.x + scale(x, 0, width, -size.x / 2, size.x / 2),
    y: pos.y + scale(y, height, 0, -size.y / 2, size.y / 2),
  };

  let iter = 0;
  while (iter < maxIterations) {
    const { x, y } = z;
    z.x = x * x - y * y + c.x;
    z.y = 2 * x * y + c.y;
    if (Math.abs(z.x + z.y) > 16) {
      break;
    }
    iter++;
  }
  return iter;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(
  gl: WebGLRenderingContext,
  type: GLenum,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);

  if (shader === null) {
    console.error("problem loading shader");
    return null;
  }

  // Send the source to the shader object

  gl.shaderSource(shader, source);

  // Compile the shader program

  gl.compileShader(shader);

  // See if it compiled successfully

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(
      `An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`,
    );
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function initShaderProgram(
  gl: WebGLRenderingContext,
  vsSource: string,
  fsSource: string,
): WebGLProgram | null {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  if (vertexShader === null || fragmentShader === null) {
    console.error("problem initialising shader program");
    return null;
  }

  // Create the shader program

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert(
      `Unable to initialize the shader program: ${gl.getProgramInfoLog(
        shaderProgram,
      )}`,
    );
    return null;
  }

  return shaderProgram;
}

function App() {
  const canvas = useRef<HTMLCanvasElement>(null);

  function plot() {
    console.time("plot");
    if (!canvas.current) {
      return;
    }

    const ctx: CanvasRenderingContext2D = canvas.current.getContext("2d", {
      alpha: false,
    })!;

    // Get the DPR and size of the canvas
    const devicePixelRatio = 1;
    // TODO: return this when performance is better
    // const devicePixelRatio = window.devicePixelRatio;
    const rect = canvas.current.getBoundingClientRect();

    // Set the "actual" size of the canvas
    canvas.current.width = rect.width * devicePixelRatio;
    canvas.current.height = rect.height * devicePixelRatio;

    // Scale the context to ensure correct drawing operations
    ctx.scale(devicePixelRatio, devicePixelRatio);

    // Set the "drawn" size of the canvas
    canvas.current.style.width = `${rect.width}px`;
    canvas.current.style.height = `${rect.height}px`;

    const { width, height } = ctx.canvas;
    console.log("width: ", width);
    console.log("height: ", height);
    const imageData = ctx.getImageData(0, 0, width, height);

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const iter = getIterationCount({
          x,
          y,
          width,
          height,
        });
        const [r, g, b] = getRGBFromHSV({
          h: scale(iter, 0, maxIterations, 0, 1),
          s: 1,
          // TODO: can probably just set to black and avoid the calculation if this is 0
          v: iter === maxIterations ? 0 : 1,
        });
        setPixelRGB({
          x,
          y,
          width,
          r,
          g,
          b,
          pixels: imageData.data,
        });
      }
    }
    ctx.putImageData(imageData, 0, 0);
    console.timeEnd("plot");
  }

  function plotWebGL() {
    console.time("plotWebGL");
    if (!canvas.current) {
      return;
    }

    const gl = canvas.current.getContext("webgl");

    if (gl === null) {
      console.error("WebGL not supported");
      return;
    }

    // Set canvas resolution to match display size
    const devicePixelRatio = 1;
    const rect = canvas.current.getBoundingClientRect();
    canvas.current.width = rect.width * devicePixelRatio;
    canvas.current.height = rect.height * devicePixelRatio;

    const vsSource = `
    attribute vec4 aVertexPosition;

    void main(void) {
      gl_Position = aVertexPosition;
    }
  `;

    const fsSource = `
    precision highp float;

    uniform float uCanvasWidth;
    uniform float uCanvasHeight;
    uniform float uPosX;
    uniform float uPosY;
    uniform float uSizeX;
    uniform float uSizeY;
    uniform float uCx;
    uniform float uCy;
    uniform float uMaxIterations;

    // HSV to RGB conversion
    vec3 hsvToRgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    // Scale function - maps value from one range to another
    float scale(float value, float fromStart, float fromEnd, float toStart, float toEnd) {
      return ((value - fromStart) / (fromEnd - fromStart)) * (toEnd - toStart) + toStart;
    }

    // Julia set iteration count
    float getIterationCount(float px, float py) {
      float zx = uPosX + scale(px, 0.0, uCanvasWidth, -uSizeX / 2.0, uSizeX / 2.0);
      float zy = uPosY + scale(py, uCanvasHeight, 0.0, -uSizeY / 2.0, uSizeY / 2.0);
      
      float iter = 0.0;
      for (int i = 0; i < 300; i++) {
        if (iter >= uMaxIterations) break;
        float xtemp = zx * zx - zy * zy + uCx;
        float ytemp = 2.0 * zx * zy + uCy;
        zx = xtemp;
        zy = ytemp;
        if (abs(zx + zy) > 16.0) break;
        iter += 1.0;
      }
      return iter;
    }

    void main(void) {
      float px = gl_FragCoord.x;
      float py = gl_FragCoord.y;
      
      float iter = getIterationCount(px, py);
      
      float hue = scale(iter, 0.0, uMaxIterations, 0.0, 1.0);
      float saturation = 1.0;
      float value = (iter >= uMaxIterations) ? 0.0 : 1.0;
      
      vec3 rgb = hsvToRgb(vec3(hue, saturation, value));
      
      gl_FragColor = vec4(rgb, 1.0);
    }
  `;

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    if (shaderProgram === null) {
      console.error("error from initShaderProgram");
      return;
    }

    // Collect all the info needed to use the shader program.
    // Look up which attribute our shader program is using
    // for aVertexPosition and look up uniform locations.
    const programInfo: ProgramInfo = {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
      },
      uniformLocations: {
        canvasWidth: gl.getUniformLocation(shaderProgram, "uCanvasWidth"),
        canvasHeight: gl.getUniformLocation(shaderProgram, "uCanvasHeight"),
        posX: gl.getUniformLocation(shaderProgram, "uPosX"),
        posY: gl.getUniformLocation(shaderProgram, "uPosY"),
        sizeX: gl.getUniformLocation(shaderProgram, "uSizeX"),
        sizeY: gl.getUniformLocation(shaderProgram, "uSizeY"),
        cx: gl.getUniformLocation(shaderProgram, "uCx"),
        cy: gl.getUniformLocation(shaderProgram, "uCy"),
        maxIterations: gl.getUniformLocation(shaderProgram, "uMaxIterations"),
      },
    };

    // Tell WebGL to use our program before setting uniforms
    gl.useProgram(programInfo.program);

    // Set viewport to match canvas size
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Set uniform values from current state
    // Use actual canvas resolution, not CSS size
    const width = gl.canvas.width;
    const height = gl.canvas.height;

    gl.uniform1f(programInfo.uniformLocations.canvasWidth, width);
    gl.uniform1f(programInfo.uniformLocations.canvasHeight, height);
    gl.uniform1f(programInfo.uniformLocations.posX, pos.x);
    gl.uniform1f(programInfo.uniformLocations.posY, pos.y);
    gl.uniform1f(programInfo.uniformLocations.sizeX, size.x);
    gl.uniform1f(programInfo.uniformLocations.sizeY, size.y);
    gl.uniform1f(programInfo.uniformLocations.cx, c.x);
    gl.uniform1f(programInfo.uniformLocations.cy, c.y);
    gl.uniform1f(programInfo.uniformLocations.maxIterations, maxIterations);

    // Here's where we call the routine that builds all the
    // objects we'll be drawing.
    const buffers = initBuffers(gl);

    // Draw the scene
    drawScene(gl, programInfo, buffers);

    // // Set clear color to black, fully opaque
    // gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // // Clear the color buffer with specified clear color
    // gl.clear(gl.COLOR_BUFFER_BIT);

    console.timeEnd("plotWebGL");
  }

  // useEffect(() => {
  //   plot();
  // }, []);

  return (
    <>
      <Canvas ref={canvas} />
      <ButtonContainer>
        <button onClick={plot}>Plot</button>
        <button onClick={plotWebGL}>Plot WebGL</button>
      </ButtonContainer>
    </>
  );
}

export default App;
