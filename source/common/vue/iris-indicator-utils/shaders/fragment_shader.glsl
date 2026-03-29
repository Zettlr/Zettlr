#version 300 es // Use WebGL2/ES 3.0

// Fragment shader: Specifies colors for each pixel.
// Good resource, too: https://learnwebgl.brown37.net/12_shader_language/glsl_builtin_functions.html
// Cheat sheet: https://learnwebgl.brown37.net/12_shader_language/documents/webgl-reference-card-1_0.pdf
// Define a precision
precision highp float;

// Enum that must be defined the same way in the WebGL code and the shaders.
// This defines what transformation the fragment shader will apply to the color
// values. NOTE that mostly this will be implemented into six different shaders,
// but I wanted to keep only a single WebGL program to reduce complexity.
float FRAGMENT_PASS_PASSTHROUGH = 0.0;
float FRAGMENT_PASS_NORMAL = 1.0;
float FRAGMENT_PASS_BLUR = 2.0;
float FRAGMENT_PASS_COMPOSITE = 3.0;
float FRAGMENT_PASS_TONEMAP = 4.0;
float FRAGMENT_PASS_BRIGHTNESS = 5.0;

// Coming from the vertex shader
in vec2 v_texcoord;
in float v_pass; // Which pass are we in currently?

// Produced by the fragment shader. (The fragment shader can write to multiple
// color attachments on framebuffers using the location parameter.)
layout (location = 0) out vec4 fragColor;

// Courtesy of https://learnopengl.com/Advanced-Lighting/Bloom
uniform bool u_blur_horizontal; // If true, blur horizontally
float blur_weight[7] = float[7] (0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216, 0.007, 0.002); // Weights for blurring
const int repeats = 7; // How many of the weights should we use?

uniform sampler2D u_texture; // Main texture
uniform sampler2D u_blurTexture; // Blur texture

// This is a color that is set during inactivity. It should also be very bright
// but have no color.
vec4 INACTIVE_COLOR = vec4(1.0); // vec4(10.0, 10.0, 10.0, 1.0);

const float PI = 3.1415926535897932384626433;
const float MAX_RADIANS = PI * 2.0;

// Describes one segment of the indicator circle. All ratios must add up to 1
struct Segment {
  float ratio;
  vec4 color;
};

// We allow up to four segments. These can define colors and ratios.
uniform Segment u_segments[4];

// Specifies the blend ratio. We pass it as a uniform to reduce the amount of
// recomputation, since this is only dependent on the minimum ratio in the
// Segments. Deferring this work to JavaScript cuts on GPU time.
uniform float u_blendRatio;

float luminance (vec3 c) {
  // Magic numbers used to calculate luminance (copied from somewhere on the internet)
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

vec3 reinhard_jodie_tonemap (vec3 c) {
    float l = luminance(c);
    vec3 tc = c / (c + 1.0);
    return mix(c / (l + 1.0), tc, tc);
}

// cf.: https://64.github.io/tonemapping/
vec3 aces_approx_tonemap(vec3 v) {
    v *= 0.6;
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((v*(a*v+b))/(v*(c*v+d)+e), 0.0, 1.0);
}

vec4 compute_color () {
  // Compute the correct color for the pixel at this position.
  // NOTE: We MUST convert the coords to clip space in the vertex shader and
  // then back here for the rasterizer to work which will look at the variable
  // in between! Even though it appears like double-work, comparing what the
  // vertex shader does, and what we have to do here.
  vec2 coords = (v_texcoord.xy - 0.5) * 2.0 * vec2(-1, 1);
  // NOTE: `atan` works like the `atan2` we know from, e.g., C or JS, not like
  // `atan`.
  float rad = atan(coords.y, coords.x) + PI;

  float radThreshold = MAX_RADIANS * u_blendRatio;

  float segmentStart = 0.0; // In rads
  float segmentEnd = 0.0; // In rads
  vec4 prevColor = INACTIVE_COLOR;
  // Preset with the color of the last non-empty segment
  for (int i = u_segments.length() - 1; i >= 0; i--) {
    if (u_segments[i].ratio > 0.0) {
      prevColor = u_segments[i].color;
      break;
    }
  }

  for (int i = 0; i < u_segments.length(); i++) {
    if (u_segments[i].ratio == 0.0) {
      continue; // Skip this segment
    }

    vec4 currentColor = u_segments[i].color;
    segmentEnd = segmentStart + u_segments[i].ratio * MAX_RADIANS;

    if (rad >= segmentStart && rad <= segmentStart + radThreshold) {
      // Pixel is in the blend-area between prev color and current color
      // Mix ratio must range between 0.5 (mix between prev and cur) and 1.0
      // (only cur).
      float blendStart = segmentStart - radThreshold;
      float blendEnd = segmentStart + radThreshold;
      // Avoid division by zero at the start of our calculations
      return mix(prevColor, currentColor, (rad - blendStart + 1.0) / (blendEnd - blendStart + 1.0));
    } else if (rad > segmentStart + radThreshold && rad <= segmentEnd - radThreshold) {
      // Pixel is in the solid current color area
      return currentColor;
    } else if (rad > segmentEnd - radThreshold && rad <= segmentEnd) {
      // Pixel is in the blend-area between current color and next color
      // Find the next available color (read: which is not a ratio of 0)
      vec4 nextColor = INACTIVE_COLOR;
      int next = i == u_segments.length() - 1 ? 0 : i + 1;
      Segment nextSegment = u_segments[next];
      for (int j = 0; j < u_segments.length(); j++) {
        if (nextSegment.ratio > 0.0) {
          nextColor = nextSegment.color;
          break;
        }

        next++;

        if (next >= u_segments.length() - 1) {
          next = 0;
        }

        nextSegment = u_segments[next];
      }

      float blendStart = segmentEnd - radThreshold;
      float blendEnd = segmentEnd + radThreshold;
      return mix(currentColor, nextColor, (rad - blendStart) / (blendEnd - blendStart));
    }

    // Pixel is not in this color segment -> check next iteration
    segmentStart = segmentEnd;
    prevColor = u_segments[i].color;
  }

  // We couldn't associate the current pixel with any segment. This usually only
  // happens when the ratios do not sum up to 1.0. Return the inactive color..
  return INACTIVE_COLOR;
}

// Courtesy of https://learnopengl.com/Advanced-Lighting/Bloom
vec4 blur () {
  vec2 texel = vec2(1.0, 1.0) / vec2(textureSize(u_texture, 0));
  vec4 result = texture(u_texture, v_texcoord) * blur_weight[0];
  if (u_blur_horizontal) {
    for (int i = 1; i < repeats; i++) {
      result += texture(u_texture, v_texcoord + texel * vec2(i, 0.0)) * blur_weight[i];
      result += texture(u_texture, v_texcoord - texel * vec2(i, 0.0)) * blur_weight[i];
    }
  } else {
    for (int i = 1; i < repeats; i++) {
      result += texture(u_texture, v_texcoord + texel * vec2(0.0, i)) * blur_weight[i];
      result += texture(u_texture, v_texcoord - texel * vec2(0.0, i)) * blur_weight[i];
    }
  }

  return result;
}

vec3 tonemap (vec3 color) {
  // Exposure setting
  const float exposure = 0.5;
  color = vec3(1.0) - exp(-color * exposure);
  // Gamma correction
  const float gamma = 0.8;
  color = pow(color, vec3(1.0 / gamma));
  return color;
}

void main() {
  if (v_pass == FRAGMENT_PASS_PASSTHROUGH) {
    // Pass-through: only copies the texture information
    fragColor = texture(u_texture, v_texcoord);
  } else if (v_pass == FRAGMENT_PASS_NORMAL) {
    // Render-pass: This renders the rays, which means we need to calculate the
    // colors for each ray based on the circle information provided in the
    // segments.
    fragColor = compute_color();
  } else if (v_pass == FRAGMENT_PASS_BRIGHTNESS) {
    // Brightness pass: Should return only very bright pixels; used for the
    // bloom filter.
    fragColor = texture(u_texture, v_texcoord);
    float l = luminance(fragColor.rgb);
    fragColor = l > 1.0 ? fragColor : vec4(0.0, 0.0, 0.0, 0.0);
  } else if (v_pass == FRAGMENT_PASS_BLUR) {
    // Blur-pass: This receives a texture (the brightness texture from the
    // brightness pass), and should apply blur to it. It does so alternatingly
    // horizontally and vertically.
    fragColor = blur();
  } else if (v_pass == FRAGMENT_PASS_COMPOSITE) {
    // Compositing pass: This receives two textures, a blurred one and the
    // original, and it should merge the two.
    vec4 originalColor = texture(u_texture, v_texcoord);
    vec4 blurColor = texture(u_blurTexture, v_texcoord);
    fragColor = originalColor + blurColor;
  } else if (v_pass == FRAGMENT_PASS_TONEMAP) {
    vec4 result_color = texture(u_texture, v_texcoord);
    fragColor = vec4(tonemap(result_color.rgb), result_color.a);
  }
}
