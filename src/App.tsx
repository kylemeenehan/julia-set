import { useRef, useState, useEffect } from "react";
import "./App.css";
import styled from "@emotion/styled";
import { drawScene, type ProgramInfo } from "./draw-scene";
import { initBuffers } from "./init-buffers";

// Import shaders as raw text strings
// Vite's ?raw import allows us to import files as strings
// This keeps shaders in separate .glsl files with proper syntax highlighting
import vertexShaderSource from "./shaders/vertex.glsl?raw";
import fragmentShaderSource from "./shaders/fragment.glsl?raw";

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

// Helper function to map mouse coordinates to complex plane coordinates
function getComplexCoordinateFromMouse(
  mouseX: number,
  mouseY: number,
  canvasWidth: number,
  canvasHeight: number,
  viewPosX: number,
  viewPosY: number,
  viewSizeX: number,
  viewSizeY: number,
): Vec {
  // Map mouse pixel coordinates to complex plane coordinates
  // The mouse position is converted using the same scale function as the shader
  return {
    x: viewPosX + scale(mouseX, 0, canvasWidth, -viewSizeX / 2, viewSizeX / 2),
    y: viewPosY + scale(mouseY, canvasHeight, 0, -viewSizeY / 2, viewSizeY / 2),
  };
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
  // Create a shader object
  // type is either gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
  const shader = gl.createShader(type);

  if (shader === null) {
    console.error("problem loading shader");
    return null;
  }

  // Send the shader source code to the GPU
  gl.shaderSource(shader, source);

  // Compile the shader
  // This translates the GLSL code into GPU machine code
  gl.compileShader(shader);

  // Check if compilation succeeded
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    // If compilation failed, get the error message and alert the user
    alert(
      `An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`,
    );
    // Clean up the failed shader
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

// Link vertex and fragment shaders into a complete program
function initShaderProgram(
  gl: WebGLRenderingContext,
  vsSource: string,
  fsSource: string,
): WebGLProgram | null {
  // Compile the vertex shader
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  // Compile the fragment shader
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  if (vertexShader === null || fragmentShader === null) {
    console.error("problem initialising shader program");
    return null;
  }

  // Create a shader program
  // A program is a combination of vertex and fragment shaders
  const shaderProgram = gl.createProgram();
  
  // Attach both shaders to the program
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  
  // Link the program
  // This finalizes the combination of shaders into an executable program
  gl.linkProgram(shaderProgram);

  // Check if linking succeeded
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
  
  // State for tracking mouse position mapped to complex plane
  const [mouseC, setMouseC] = useState<Vec>({ x: -0.742, y: 0.163 });
  
  // Refs for 60 FPS throttling
  const lastRenderTimeRef = useRef<number>(0);
  const frameInterval = 1000 / 60; // ~16.67ms for 60 FPS

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

    // Get the WebGL rendering context - this is our interface to the GPU
    // WebGL 1.0 is widely supported; WebGL 2.0 has more features but less compatibility
    const gl = canvas.current.getContext("webgl");

    if (gl === null) {
      console.error("WebGL not supported");
      return;
    }

    // Set canvas resolution to match display size
    // This is critical: canvas.width/height is the actual resolution WebGL renders at
    // If not set, WebGL defaults to 300x150 pixels!
    // Note: devicePixelRatio would use retina/high-DPI resolution; we keep it at 1 for simplicity
    const devicePixelRatio = 1;
    const rect = canvas.current.getBoundingClientRect();
    canvas.current.width = rect.width * devicePixelRatio;
    canvas.current.height = rect.height * devicePixelRatio;

    // Compile vertex and fragment shaders into a shader program
    // A shader program is like an executable that runs on the GPU
    const shaderProgram = initShaderProgram(gl, vertexShaderSource, fragmentShaderSource);
    if (shaderProgram === null) {
      console.error("error from initShaderProgram");
      return;
    }

    // Collect all the info needed to use the shader program
    // This object maps JavaScript variable names to their GPU locations
    // Attributes are per-vertex data (position in this case)
    // Uniforms are constant across all vertices/fragments in this draw call
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

    // Activate this shader program
    // All subsequent WebGL calls will use this program until we switch to another
    gl.useProgram(programInfo.program);

    // Set viewport: tells WebGL which part of the canvas to render to
    // Usually this matches the canvas size, but you can render to a smaller portion
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Set uniform values from current state
    // These values are passed to ALL fragments in this render call
    // Use actual canvas resolution, not CSS size - must match what we set above
    const width = gl.canvas.width;
    const height = gl.canvas.height;

    // Pass canvas dimensions to shader
    gl.uniform1f(programInfo.uniformLocations.canvasWidth, width);
    gl.uniform1f(programInfo.uniformLocations.canvasHeight, height);
    
    // Pass Julia set parameters to shader
    gl.uniform1f(programInfo.uniformLocations.posX, pos.x);
    gl.uniform1f(programInfo.uniformLocations.posY, pos.y);
    gl.uniform1f(programInfo.uniformLocations.sizeX, size.x);
    gl.uniform1f(programInfo.uniformLocations.sizeY, size.y);
    
    // Pass Julia constant c (use mouseC if available, otherwise use default)
    gl.uniform1f(programInfo.uniformLocations.cx, mouseC.x);
    gl.uniform1f(programInfo.uniformLocations.cy, mouseC.y);
    
    // Pass iteration limit
    gl.uniform1f(programInfo.uniformLocations.maxIterations, maxIterations);

    // Create and setup geometry buffers (position data for our quad)
    const buffers = initBuffers(gl);

    // Render the scene
    // This calls all the drawing commands: bind buffers, set attributes, clear, and draw
    drawScene(gl, programInfo, buffers);

    console.timeEnd("plotWebGL");
  }

  // Set up mouse move listener to update Julia constant c
  // This effect runs once when the component mounts
  useEffect(() => {
    const canvasElement = canvas.current;
    if (!canvasElement) return;

    // Handler for mouse move events
    // Throttled to 60 FPS using timestamp checking
    const handleMouseMove = (event: MouseEvent) => {
      const now = Date.now();
      
      // Only process if enough time has passed (60 FPS = ~16.67ms between frames)
      if (now - lastRenderTimeRef.current < frameInterval) {
        return;
      }
      lastRenderTimeRef.current = now;

      // Get the canvas bounding rectangle
      // This tells us where the canvas is positioned on screen
      const rect = canvasElement.getBoundingClientRect();
      
      // Calculate mouse position relative to canvas
      // (0, 0) is at the top-left of the canvas
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      
      // Map mouse coordinates to complex plane coordinates
      // The origin (0, 0) of the complex plane is in the center of the screen
      const newC = getComplexCoordinateFromMouse(
        mouseX,
        mouseY,
        rect.width,
        rect.height,
        pos.x,
        pos.y,
        size.x,
        size.y,
      );
      
      // Update the Julia constant c
      setMouseC(newC);
    };

    // Attach the mouse move listener
    canvasElement.addEventListener("mousemove", handleMouseMove);

    // Cleanup: remove the listener when component unmounts
    return () => {
      canvasElement.removeEventListener("mousemove", handleMouseMove);
    };
  }, [frameInterval]); // Only depends on frameInterval which is constant

  // Render whenever mouseC changes (after being updated by mouse move)
  useEffect(() => {
    plotWebGL();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mouseC]); // Re-render whenever the Julia constant c changes

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
