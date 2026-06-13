// Fragment Shader: runs once per pixel (fragment)
// This is where the Julia set computation happens - it runs on the GPU for every pixel in parallel

// Use high precision floats for accuracy in the Julia set calculation
// Lower precision (mediump, lowp) can cause visible banding/artifacts
precision highp float;

// === Uniforms ===
// Uniforms are constant across all fragments in a draw call
// They're set from the JavaScript side before rendering

// Canvas dimensions in pixels - needed to map pixel coordinates to Julia space
uniform float uCanvasWidth;
uniform float uCanvasHeight;

// Julia set parameters
uniform float uPosX;              // X position of the center of view
uniform float uPosY;              // Y position of the center of view
uniform float uSizeX;             // Width of the view in complex space
uniform float uSizeY;             // Height of the view in complex space
uniform float uCx;                // Real part of Julia constant c
uniform float uCy;                // Imaginary part of Julia constant c
uniform float uMaxIterations;     // Maximum iterations before we consider a point as in the set

// HSV to RGB conversion
// HSV is an intuitive color space: Hue (color), Saturation (intensity), Value (brightness)
// This converts it to RGB which is what monitors display
vec3 hsvToRgb(vec3 c) {
  // Standard HSV to RGB algorithm
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Scale function - maps a value from one range to another
// Used to convert pixel coordinates to complex plane coordinates
float scale(float value, float fromStart, float fromEnd, float toStart, float toEnd) {
  return ((value - fromStart) / (fromEnd - fromStart)) * (toEnd - toStart) + toStart;
}

// Julia set iteration count
// Computes: for a given complex number z, iterate z = z^2 + c
// Count how many iterations before |z| > 16 (escapes) or we hit max iterations
float getIterationCount(float px, float py) {
  // Map pixel coordinates (0 to width/height) to complex plane coordinates
  // The scale() function maps:
  // - px from [0, width] to [-sizeX/2, sizeX/2] then adds posX offset
  // - py from [height, 0] to [-sizeY/2, sizeY/2] then adds posY offset
  // (Note: py is inverted because pixel Y goes down, but complex Y goes up)
  float zx = uPosX + scale(px, 0.0, uCanvasWidth, -uSizeX / 2.0, uSizeX / 2.0);
  float zy = uPosY + scale(py, uCanvasHeight, 0.0, -uSizeY / 2.0, uSizeY / 2.0);
  
  float iter = 0.0;
  // Fixed loop of 300 iterations (GLSL requires loop bounds to be known at compile time)
  // We break early if we hit the max or if the value escapes
  for (int i = 0; i < 1000; i++) {
    if (iter >= uMaxIterations) break;
    
    // Julia set formula: z = z^2 + c
    // z^2 = (x + yi)^2 = x^2 - y^2 + 2xyi
    float xtemp = zx * zx - zy * zy + uCx;
    float ytemp = 2.0 * zx * zy + uCy;
    zx = xtemp;
    zy = ytemp;
    
    // If magnitude is > 16, the sequence will escape to infinity
    // |z| = sqrt(x^2 + y^2), but we compare |z|^2 > 256 to avoid sqrt
    // Using |x + y| > 16 is a looser but faster approximation
    if (abs(zx + zy) > 16.0) break;
    iter += 1.0;
  }
  return iter;
}

void main(void) {
  // gl_FragCoord is the current pixel coordinate in screen space
  // Range: (0, 0) at bottom-left to (width, height) at top-right
  float px = gl_FragCoord.x;
  float py = gl_FragCoord.y;
  
  // Compute how many iterations this pixel takes to escape
  float iter = getIterationCount(px, py);
  
  // Map iteration count to a color using HSV
  // hue: varies from 0 (red) to 1 (wraps back to red)
  //      creates the rainbow color bands in the Julia set
  float hue = scale(iter, 0.0, uMaxIterations, 0.0, 1.0);
  
  // saturation: always full (1.0) for vibrant colors
  float saturation = 1.0;
  
  // value (brightness): 
  // - 0 (black) if the point is in the Julia set (iter == maxIterations)
  // - 1 (full brightness) if it escaped
  float value = (iter >= uMaxIterations) ? 0.0 : 1.0;
  
  // Convert HSV to RGB and output as final color
  // The alpha channel (1.0) is always fully opaque
  vec3 rgb = hsvToRgb(vec3(hue, saturation, value));
  gl_FragColor = vec4(rgb, 1.0);
}
