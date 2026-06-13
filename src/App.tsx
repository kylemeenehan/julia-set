import { useEffect, useRef } from "react";
import p5 from "p5";
import "./App.css";
import styled from "@emotion/styled";

const Canvas = styled.canvas`
  width: 100%;
  height: 100%;
`;

const x = 0.1;
const y = 0.5;
const maxIterations = 150;
const origSize: p5.Vector = new p5.Vector(3, 3);
const size: p5.Vector = new p5.Vector(origSize.x, origSize.y);
const originPosition: p5.Vector = new p5.Vector(0, 0);
const pos: p5.Vector = new p5.Vector(originPosition.x, originPosition.y);
// const c = new p5.Vector(0, 0);
const c = new p5.Vector(-0.742, 0.163);

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

function App() {
  const canvas = useRef<HTMLCanvasElement>(null);

  function plot() {
    if (!canvas.current) {
      return;
    }

    const ctx: CanvasRenderingContext2D = canvas.current.getContext("2d", {
      alpha: false,
    })!;

    // Get the DPR and size of the canvas
    const dpr = window.devicePixelRatio;
    const rect = canvas.current.getBoundingClientRect();

    // Set the "actual" size of the canvas
    canvas.current.width = rect.width * dpr;
    canvas.current.height = rect.height * dpr;

    // Scale the context to ensure correct drawing operations
    ctx.scale(dpr, dpr);

    // Set the "drawn" size of the canvas
    canvas.current.style.width = `${rect.width}px`;
    canvas.current.style.height = `${rect.height}px`;

    const { width, height } = ctx.canvas;
    console.log("width: ", width);
    console.log("height: ", height);
    const imageData = ctx.getImageData(0, 0, width, height);

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const sqZ = new p5.Vector(0, 0);
        const z = new p5.Vector(
          pos.x + scale(x, 0, width, -size.x / 2, size.x / 2),
          pos.y + scale(y, height, 0, -size.y / 2, size.y / 2),
        );

        let iter = 0;
        while (iter < maxIterations) {
          sqZ.x = z.x * z.x - z.y * z.y;
          sqZ.y = 2 * z.x * z.y;
          z.x = sqZ.x + c.x;
          z.y = sqZ.y + c.y;
          if (Math.abs(z.x + z.y) > 16) {
            break;
          }
          iter++;
        }
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
  }

  useEffect(() => {
    plot();
  }, []);

  return (
    <>
      <Canvas ref={canvas} />
    </>
  );
}

export default App;
