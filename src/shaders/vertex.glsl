// Vertex Shader: runs once per vertex
// In our case, we have 4 vertices forming a full-screen quad
// The shader simply passes the vertex position through to the rasterizer
// We don't transform it since we're already in normalized device coordinates [-1, 1]

attribute vec4 aVertexPosition;

void main(void) {
  gl_Position = aVertexPosition;
}
