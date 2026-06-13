export type Buffers = {
  position: WebGLBuffer;
};

export function initBuffers(gl: WebGLRenderingContext): Buffers {
  const positionBuffer = initPositionBuffer(gl);

  return {
    position: positionBuffer,
  };
}

function initPositionBuffer(gl: WebGLRenderingContext): WebGLBuffer {
  // Create a buffer object - this is a handle to GPU memory
  // A buffer is like a container that holds data on the GPU
  const positionBuffer = gl.createBuffer();

  // Bind the buffer to the ARRAY_BUFFER target
  // This tells WebGL "all subsequent buffer operations apply to this buffer"
  // It's like "selecting" this buffer for editing
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Define the geometry: a full-screen quad (4 vertices)
  // Each pair of values is (x, y) in normalized device coordinates (NDC)
  // NDC range: -1 to 1 maps to the full screen
  // (1, 1) = top-right, (-1, 1) = top-left, (1, -1) = bottom-right, (-1, -1) = bottom-left
  // This creates a quad that covers the entire screen, with vertices drawn as TRIANGLE_STRIP
  const positions = [
    1.0,   1.0,   // vertex 0: top-right
    -1.0,  1.0,   // vertex 1: top-left
    1.0,  -1.0,   // vertex 2: bottom-right
    -1.0, -1.0,   // vertex 3: bottom-left
  ];

  // Copy the position data to GPU memory
  // Float32Array: tells GPU this is 32-bit floating point data
  // gl.STATIC_DRAW: hint that this data won't change often (allows GPU optimization)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  return positionBuffer;
}
