//
// creates a shader of the given type, uploads the source and
// compiles it.
//
export function loadShader(
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
export function initShaderProgram(
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
