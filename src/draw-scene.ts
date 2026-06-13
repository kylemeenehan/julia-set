import type { Buffers } from "./init-buffers";

// ProgramInfo: metadata about a shader program
// This object maps semantic names to their GPU locations
// It's how we communicate between JavaScript and the GPU
export type ProgramInfo = {
  program: WebGLProgram;           // The compiled shader program
  attribLocations: {
    vertexPosition: number;        // Location of aVertexPosition attribute in the shader
  };
  uniformLocations: {
    // All the uniform locations - these are set from JavaScript before rendering
    canvasWidth: WebGLUniformLocation | null;
    canvasHeight: WebGLUniformLocation | null;
    posX: WebGLUniformLocation | null;
    posY: WebGLUniformLocation | null;
    sizeX: WebGLUniformLocation | null;
    sizeY: WebGLUniformLocation | null;
    cx: WebGLUniformLocation | null;
    cy: WebGLUniformLocation | null;
    maxIterations: WebGLUniformLocation | null;
  };
};

// Tell WebGL how to pull out the positions from the position buffer
// into the vertexPosition attribute
function setPositionAttribute(
  gl: WebGLRenderingContext,
  buffers: Buffers,
  programInfo: ProgramInfo,
) {
  // How many values per vertex
  // We use 2D positions, so 2 values (x, y)
  const numComponents = 2;
  
  // Data type of each value (32-bit float)
  const type = gl.FLOAT;
  
  // Whether to normalize values (for our purposes, no)
  const normalize = false;
  
  // Stride: bytes between successive vertices
  // 0 means the data is tightly packed with no gaps
  const stride = 0;
  
  // Offset: where to start reading in the buffer (bytes)
  const offset = 0;
  
  // Bind the position buffer as the source of vertex data
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  
  // Tell WebGL how to interpret the data in the buffer
  // This connects the shader's aVertexPosition attribute to the buffer data
  gl.vertexAttribPointer(
    programInfo.attribLocations.vertexPosition,
    numComponents,
    type,
    normalize,
    stride,
    offset,
  );
  
  // Enable the vertex attribute
  // Without this, the attribute would be disabled and not used
  gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
}

// Main rendering function
// This sets up the rendering state and executes the draw call
export function drawScene(
  gl: WebGLRenderingContext,
  programInfo: ProgramInfo,
  buffers: Buffers,
) {
  // Set the color to clear to (black, fully opaque)
  // This is called every frame before clearing
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  
  // Clear depth buffer
  // Depth testing isn't really used in our simple Julia set render,
  // but we set it up anyway for completeness
  gl.clearDepth(1.0);
  
  // Enable depth testing
  // This determines whether closer objects appear in front of farther ones
  gl.enable(gl.DEPTH_TEST);
  
  // Set depth comparison function
  // LEQUAL: a fragment passes the test if its depth is less than or equal to the stored depth
  gl.depthFunc(gl.LEQUAL);

  // Clear the canvas before drawing
  // COLOR_BUFFER_BIT: clear the color data (set to clearColor)
  // DEPTH_BUFFER_BIT: clear the depth data (set to clearDepth)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Connect the position buffer to the shader's vertex attribute
  // This tells WebGL which buffer to read vertex data from
  setPositionAttribute(gl, buffers, programInfo);

  // Activate the shader program
  // All subsequent GPU operations use this program until we switch
  gl.useProgram(programInfo.program);

  // Draw the vertices
  // TRIANGLE_STRIP: treats vertices as a strip of connected triangles
  //   Vertices 0,1,2 form triangle 1
  //   Vertices 1,2,3 form triangle 2
  //   Together they form a quad
  // offset: start drawing from vertex 0
  // vertexCount: draw 4 vertices
  {
    const offset = 0;
    const vertexCount = 4;
    gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
  }
}
