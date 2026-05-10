#version 300 es // Use WebGL2/ES 3.0

// Vertex shaders: Compute positions (from 3d -> clip plane)

// Enum that must be defined the same way in the WebGL code and the shaders
float FRAGMENT_PASS_PASSTHROUGH = 0.0;
float FRAGMENT_PASS_NORMAL = 1.0;
float FRAGMENT_PASS_BLUR = 2.0;
float FRAGMENT_PASS_COMPOSITE = 3.0;
float FRAGMENT_PASS_TONEMAP = 4.0;
float FRAGMENT_PASS_BRIGHTNESS = 5.0;

// "in" declares something that receives data from JS
in vec2 a_position; // NOTE: 2d because we work in x/y pixels

uniform vec2 u_resolution; // The canvas resolution ("uniform" = remains the same for each call of the shader)
uniform mat3 u_matrix; // Transformation matrix, to be applied to each position
uniform float u_pass; // Which pass are we in currently?

// Pass the following to the fragment shader
out vec2 v_texcoord;
out float v_pass; // We must pass the uniform from here.

// This function will be executed by the GPU
void main() {
  // First, apply our transformation (remember mat3 is xyz, but we don't use z)
  // NOTE: We only perform the transformation in the first render pass. After
  // that we are only doing post-processing, so we can essentially just forward
  // the untransformed position.
  vec2 transformed = u_pass == FRAGMENT_PASS_NORMAL
    ? (u_matrix * vec3(a_position, 1)).xy
    : a_position;

  v_pass = u_pass;

  // Convert pixel into clip space (aka -1 till +1)
  // We use a standard z transform for that (normalize->scale->center)
  vec2 normalized = transformed / u_resolution; // Abs -> 0; +1
  vec2 scaled = normalized * 2.0; // 0; +1 -> 0; +2
  vec2 centered = scaled - 1.0; // 0; +2 -> -1; +1
  vec2 clipSpacePx = centered * vec2(1, -1); // Flip y-coordinates

  // gl_Position is a special variable that "returns" the computed position.
  // We compute that one in this shader.
  // We use the clip space x/y variable, provide z = 0 and w = 1 because we
  // only want 2d.
  gl_Position = vec4(clipSpacePx, 0, 1);
  // The position is the same as the one for the position on the texture
  // However, we must convert from clip space to UV space (0; 1 from bottom-left)
  v_texcoord = clipSpacePx * 0.5 + 0.5;
}
