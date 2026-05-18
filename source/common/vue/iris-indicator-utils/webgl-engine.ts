import { compileShader, compileProgram, resizeCanvasToDisplaySize, getMSAASamples } from './util/webgl'
import vertexShaderSource from './shaders/vertex_shader.glsl'
import fragmentShaderSource from './shaders/fragment_shader.glsl'
import { type Mat3 } from './util/math'

export const MAX_SUPPORTED_SEGMENTS = 4
export type Vec4<T = number> = [T, T, T, T]
export type Vec2<T> = [T, T]

// NOTE that this color is currently set to an alpha of 0 to allow varying
// background colors (if so wished, but let me tell you it looks awful with
// anything too bright).
const BACKGROUND_COLOR: Vec4 = [ 0.3, 0.3, 0.4, 0.0 ]

export interface Segment {
  color: [number, number, number, number],
  ratio: number
}

// This is effectively unused. I kept it here to remember the difference between
// "regular" and HDR textures (see the code below).
const USE_HDR_TEXTURES = true

// Enum that must be defined the same way in the WebGL code and the shaders
const FRAGMENT_PASS_PASSTHROUGH = 0.0
const FRAGMENT_PASS_NORMAL = 1.0
const FRAGMENT_PASS_BLUR = 2.0
const FRAGMENT_PASS_COMPOSITE = 3.0
const FRAGMENT_PASS_TONEMAP = 4.0
const FRAGMENT_PASS_BRIGHTNESS = 5.0

/**
 * This class handles all the nitty-gritty of the WebGL code and ensures our
 * rays and the rest of the indicator are properly rendered onto the canvas.
 */
export class WebGLEngine {

  /**
   * The WebGL2 context
   *
   * @var {WebGL2RenderingContext}
   */
  private readonly gl: WebGL2RenderingContext

  /**
   * The compiled program utilizing our Vertex and Fragment shaders.
   *
   * @var {WebGLProgram}
   */
  private readonly program: WebGLProgram

  /**
   * The vertex array used to hold our primitives to be rendered.
   *
   * @var {WebGLVertexArrayObject}
   */
  private readonly vao: WebGLVertexArrayObject

  /**
   * The position buffer that can be loaded up with coordinates for the
   * primitives to be rendered.
   *
   * @var {WebGLContextAttributes}
   */
  private readonly positionBuffer: WebGLContextAttributes

  /**
   * Uniform and attribute locations for the various values we need to provide
   * to our shaders.
   */
  private resolutionUniformLocation: WebGLUniformLocation|null
  private matrixUniformLocation: WebGLUniformLocation|null
  private passUniformLocation: WebGLUniformLocation|null
  private textureUniformLocation: WebGLUniformLocation|null
  private blurTexUniformLocation: WebGLUniformLocation|null
  private blurHorizontalUniformLocation: WebGLUniformLocation|null
  private blendRatioUniformLocation: WebGLUniformLocation|null

  // NOTE: The segments are structs, but because GLSL is very low-level, we have
  // to address every single piece of information manually.
  private segmentLocs: Array<{ color: WebGLUniformLocation|null, ratio: WebGLUniformLocation|null }>

  private positionAttributeLocation: number

  // Rendering state

  /**
   * The "pingpong" contains two frame buffers that can be used in a ping-pong
   * fashion to post-process rendered textures. It is done by loading one of the
   * framebuffers, using it to render a single pass, then loading the second
   * buffer and providing the output of the first framebuffer as input to
   * continue to render. This way, we can, e.g., blur an image multiple times
   * with minimal effort.
   */
  private pingpong: Vec2<{ fb: WebGLFramebuffer, rbuf: WebGLTexture }>

  /**
   * The scene target contains two framebuffers (one used with and one without
   * MSAA enabled) to render our actual rays onto. The result from rendering
   * into either of these two framebuffers will then be post-processed by
   * adding, e.g., bloom and tonemapping.
   */
  private scenetarget: {
    fb: WebGLFramebuffer
    scene: WebGLTexture
    // brightness: WebGLTexture
    // If the user wants MSAA, we need to render to a renderbuffer first
    fbMSAA: WebGLFramebuffer
    rbMSAA: WebGLRenderbuffer
    // brightnessMSAA: WebGLRenderbuffer
  }

  /**
   * Determines whether bloom is currently enabled.
   *
   * @var {boolean}
   */
  private bloomEnabled: boolean

  /**
   * How many bloom passes should we do? The actual passes is twice this number
   * since we have to blur horizontally and vertically separately.
   *
   * @var {number}
   */
  private nBloomPasses: number

  /**
   * How large should the textures be rendered? Usually, it is recommended to
   * render at the actual device pixel size, not the CSS pixel size (which, on
   * high-DPI displays, is often half or a third of the actual pixels).
   *
   * @var {number}
   */
  private textureSizeModifier: number

  /**
   * Should we perform a MSAA pass over the rendered image?
   *
   * @var {boolean}
   */
  private msaaEnabled: boolean

  /**
   * This is a non-settable factor by which to multiply our colors. We are using
   * HDR colors (that exceed 1.0 or 255 in color intensity) to enable a better
   * bloom experience.
   *
   * @var {number}
   */
  private hdrFactor: number

  constructor (gl: WebGL2RenderingContext) {
    this.gl = gl

    // Set some defaults
    this.bloomEnabled = true
    this.nBloomPasses = 32
    this.msaaEnabled = true
    this.hdrFactor = 10.0
    this.textureSizeModifier = Math.min(window.devicePixelRatio, 2)

    // Compile shaders and make a program from them
    const vertexShader = compileShader(this.gl, 'vertex', vertexShaderSource)
    const fragmentShader = compileShader(this.gl, 'fragment', fragmentShaderSource)
    
    // Load the actual program
    this.program = compileProgram(this.gl, vertexShader, fragmentShader)

    // Set up the program and provide data
    gl.useProgram(this.program)

    // This is our custom global attribute state
    this.vao = gl.createVertexArray()
    gl.bindVertexArray(this.vao)

    // Set the global clear color, which effectively is the background color.
    const [ r, g, b, a ] = BACKGROUND_COLOR
    gl.clearColor(r, g, b, a)

    // We want to enable EXT_color_buffer_float to be able to render HDR
    // textures. Why do we need to "get" it, instead of "activating" or so? I
    // don't know.
    gl.getExtension('EXT_color_buffer_float')

    // Create a buffer for the coordinates of the rays
    this.positionBuffer = gl.createBuffer()

    // Extract memory addresses for the program variables. The strings are the
    // variable names as defined in the GLSL shaders.
    this.resolutionUniformLocation = gl.getUniformLocation(this.program, 'u_resolution')
    this.positionAttributeLocation = gl.getAttribLocation(this.program, 'a_position')
    this.matrixUniformLocation = gl.getUniformLocation(this.program, 'u_matrix')
    this.passUniformLocation = gl.getUniformLocation(this.program, 'u_pass')
    this.textureUniformLocation = gl.getUniformLocation(this.program, 'u_texture')
    this.blurTexUniformLocation = gl.getUniformLocation(this.program, 'u_blurTexture')
    this.blurHorizontalUniformLocation = gl.getUniformLocation(this.program, 'u_blur_horizontal')
    this.blendRatioUniformLocation = gl.getUniformLocation(this.program, 'u_blendRatio')

    // We always keep the original and blur textures at these positions, meaning
    // we don't have to update these values ever again. We just need to make
    // sure that we bind the correct textures to the correct slots.
    gl.uniform1i(this.textureUniformLocation, 0)
    gl.uniform1i(this.blurTexUniformLocation, 1)

    // Set up the color structs. Since GLSL is a bit iffy, we have to actually
    // address each of the actual hardcoded values individually, thus we store
    // them in an array here.
    this.segmentLocs = []
    for (let i = 0; i < MAX_SUPPORTED_SEGMENTS; i++) {
      this.segmentLocs.push({
        ratio: gl.getUniformLocation(this.program, `u_segments[${i}].ratio`),
        color: gl.getUniformLocation(this.program, `u_segments[${i}].color`)
      })
    }

    // Configure our vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer)
    gl.enableVertexAttribArray(this.positionAttributeLocation) // Mark the buffer as a vertex array
    // Positions are x/y coordinates (two components)
    gl.vertexAttribPointer(this.positionAttributeLocation, 2, gl.FLOAT, false, 0, 0)

    // Now we need our texture size to generate some textures and render
    // buffers. We also define some defaults for our textures (these are copied
    // to the onResize handler).
    const { cWidth, cHeight } = this.textureSize()
    const internalFormat = USE_HDR_TEXTURES ? gl.RGBA16F : gl.RGBA
    const format = gl.RGBA
    const type = USE_HDR_TEXTURES ? gl.FLOAT : gl.UNSIGNED_BYTE

    // Setup the ping-pong framebuffers for postprocessing
    this.pingpong = [
      { fb: gl.createFramebuffer(), rbuf: this.createTexture() },
      { fb: gl.createFramebuffer(), rbuf: this.createTexture() }
    ]

    for (let i = 0; i < this.pingpong.length; i++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.pingpong[i]!.fb)
      gl.bindTexture(gl.TEXTURE_2D, this.pingpong[i]!.rbuf)
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, cWidth, cHeight, 0, format, type, null)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.pingpong[i]!.rbuf, 0)
    }

    // Setup the scene target framebuffer
    // Includes a framebuffer for Multisample Anti-Aliasing (MSAA)
    // Courtesy of https://stackoverflow.com/questions/47934444/webgl-framebuffer-multisampling
    this.scenetarget = {
      // Regular framebuffer + regular texture
      fb: gl.createFramebuffer(),
      scene: this.createTexture(),
      // MSAA framebuffer + renderbuffer
      fbMSAA: gl.createFramebuffer(),
      rbMSAA: gl.createRenderbuffer()
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.scenetarget.fbMSAA)
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.scenetarget.rbMSAA)
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, getMSAASamples(gl) ?? 1, internalFormat, cWidth, cHeight)
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this.scenetarget.rbMSAA)

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.scenetarget.fb)    
    gl.bindTexture(gl.TEXTURE_2D, this.scenetarget.scene)
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, cWidth, cHeight, 0, format, type, null)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.scenetarget.scene, 0)

    // Reset the state (because WebGL is REALLY iffy if a texture or framebuffer
    // is bound and is then used as a render target. This was actually one of
    // the most common errors I had.)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindTexture(gl.TEXTURE_2D, null)
  }

  /**
   * Enables or disables bloom effect.
   *
   * @param  {boolean}  enabled  Whether bloom should be enabled
   */
  setBloomEnabled (enabled: boolean) {
    this.bloomEnabled = enabled
  }

  /**
   * Sets the intensity of bloom to be applied.
   *
   * @param  {number}  intensity  The intensity to use. Higher numbers are more bloomy results.
   */
  setBloomIntensity (intensity: 1|2|4|8) {
    this.nBloomPasses = intensity * 8 // 8, 16, 32, 64
  }

  /**
   * Enables or disables MSAA.
   *
   * @param   {boolean}  enabled  Whether MSAA should run
   */
  setMSAAEnabled (enabled: boolean) {
    this.msaaEnabled = enabled
  }

  /**
   * Determines how large textures are being rendered. By default, this uses the
   * device's pixel ratio (window.devicePixelRatio), but it can be overridden.
   * The larger the textures, the more resource-intensive.
   *
   * @param   {number}  mod  The new modifier. Should be 1, 2, 3, 4, or so.
   */
  setTextureSizeModifier (mod: number) {
    this.textureSizeModifier = Math.min(mod, 2)
    this.onResize()
  }

  /**
   * Sets the color segments. Allows up to four segments.
   *
   * @param  {Array<{ color: number[], ratio: number }>}  segments  The new segments
   */
  setSegments (segments: Array<Segment>) {
    const gl = this.gl

    for (let i = 0; i < MAX_SUPPORTED_SEGMENTS; i++) {
      const seg = segments[i % segments.length]
      let [ r, g, b, a ] = seg!.color
      r *= this.hdrFactor
      g *= this.hdrFactor
      b *= this.hdrFactor
      gl.uniform4fv(this.segmentLocs[i]!.color, [ r, g, b, a ])
      gl.uniform1f(this.segmentLocs[i]!.ratio, seg!.ratio)
    }

    // Calculate the blend ratio.
    let blendRatio = Infinity
    for (const { ratio } of segments) {
      if (ratio === 0.0) {
        continue
      }

      if (ratio < blendRatio) {
        blendRatio = ratio
      }
    }

    blendRatio /= 2.0 // Half of the smallest ratio
    blendRatio = Math.max(Math.min(blendRatio, 0.1), 0.01) // Clamp between 1% and 10%

    gl.uniform1f(this.blendRatioUniformLocation, blendRatio)
  }

  /**
   * Whenever the canvas size changes, we must call this routine to re-configure
   * all textures and framebuffers. Otherwise, all hell will break loose.
   */
  onResize () {
    const gl = this.gl
    const { cWidth, cHeight } = this.textureSize()

    const internalFormat = USE_HDR_TEXTURES ? gl.RGBA16F : gl.RGBA
    const format = gl.RGBA
    const type = USE_HDR_TEXTURES ? gl.FLOAT : gl.UNSIGNED_BYTE

    for (const { rbuf } of this.pingpong) {
      gl.bindTexture(gl.TEXTURE_2D, rbuf)
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, cWidth, cHeight, 0, format, type, null)
    }

    gl.bindTexture(gl.TEXTURE_2D, this.scenetarget.scene)
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, cWidth, cHeight, 0, format, type, null)

    gl.bindTexture(gl.TEXTURE_2D, null)

    gl.bindRenderbuffer(gl.RENDERBUFFER, this.scenetarget.rbMSAA)
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, getMSAASamples(gl) ?? 1, internalFormat, cWidth, cHeight)
    gl.bindRenderbuffer(gl.RENDERBUFFER, null)
  }

  /**
   * Creates textures with some defaults. Courtesy of WebGL fundamentals.
   *
   * @return  {WebGLTexture}  The created and configured texture.
   */
  private createTexture (): WebGLTexture {
    const gl = this.gl
    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)

    // Set up texture so we can render any size image and so we are
    // working with pixels.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    // If we set these two, linear interpolation won't work for that texture
    // anymore.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    return texture
  }

  /**
   * Set a given framebuffer including a viewport setting. Courtesy of WebGL
   * fundamentals.
   * 
   * @param {WebGLFramebuffer|null} fbo
   * @param {number} width
   * @param {number} height
   */
  setFramebuffer (fbo: WebGLFramebuffer|null, width: number, height: number, variant: 'read'|'draw'|'both' = 'both') {
    const gl = this.gl
    switch (variant) {
      case 'read':
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, fbo)
        break
      case 'draw':
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbo)
        break
      default:
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
        break
    }
    gl.uniform2f(this.resolutionUniformLocation, width, height)
    gl.viewport(0, 0, width, height)
  }

  /**
   * Returns the wanted texture size. NOTE that this is NOT the same as the
   * canvas size. Higher texture sizes are more performance-heavy, but can
   * result in smoother results.
   *
   * @return  {{ cWidth: number, cHeight: number }}  The wanted size
   */
  textureSize (): { cWidth: number, cHeight: number } {
    const gl = this.gl
    const width = gl.canvas instanceof HTMLCanvasElement ? gl.canvas.clientWidth : gl.canvas.width
    const height = gl.canvas instanceof HTMLCanvasElement ? gl.canvas.clientHeight : gl.canvas.height

    const cWidth = Math.ceil(width * this.textureSizeModifier)
    const cHeight = Math.ceil(height * this.textureSizeModifier)

    return { cWidth, cHeight }
  }

  /**
   * Expects a bunch of coordinates (pixels) and accompanying colors. This
   * function is called by the Iris Indicator to perform the actual rendering.
   *
   * @param {Float32Array} triangleData
   * @param {number} count
   * @param {Mat3} matrix
   */
  draw (triangleData: Float32Array, count: number, matrix: Mat3) {
    const gl = this.gl
    const { cWidth, cHeight } = this.textureSize()

    // Ensure the canvas has the correct size
    resizeCanvasToDisplaySize(gl.canvas as HTMLCanvasElement)

    // Clear the buffer
    gl.clear(gl.COLOR_BUFFER_BIT)

    // Activate our attribute state
    gl.bindVertexArray(this.vao)

    // FIRST PASS: Draw our rays onto the scene target
    // =========================================================================

    // The first pass uses the scenetarget framebuffer with two attached
    // textures. The first one will hold the actual texture, the second one
    // holds the brightness information.
    if (this.msaaEnabled) {
      this.setFramebuffer(this.scenetarget.fbMSAA, cWidth, cHeight)
    } else {
      this.setFramebuffer(this.scenetarget.fb, cWidth, cHeight)
    }

    gl.clear(gl.COLOR_BUFFER_BIT)

    // Tell the shaders we are doing the first pass.
    gl.uniform1f(this.passUniformLocation, FRAGMENT_PASS_NORMAL)

    // Write projection/scaling/etc. matrix
    gl.uniformMatrix3fv(this.matrixUniformLocation, false, matrix)

    // Write position data and draw the rays
    gl.bufferData(gl.ARRAY_BUFFER, triangleData, gl.DYNAMIC_DRAW)
    gl.drawArrays(gl.TRIANGLES, 0, count)

    // POST-PROCESSING PASSES
    // =========================================================================
    // Here, we pass the rendered image through all necessary additional effects.

    // First: MSAA.
    if (this.msaaEnabled) {
      // We now need to blit both render buffers into the scene targets.
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.scenetarget.fbMSAA)
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.scenetarget.fb)

      gl.blitFramebuffer(0, 0, cWidth, cHeight, 0, 0, cWidth, cHeight, gl.COLOR_BUFFER_BIT, gl.LINEAR)

      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null)
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
    }

    this.setFramebuffer(this.scenetarget.fb, cWidth, cHeight)

    // Apply a bloom filter if applicable
    let outputTexture = this.bloomEnabled
      ? this.bloomPass(this.scenetarget.scene, this.nBloomPasses)
      : this.scenetarget.scene

    // Ensure we are writing to the rectangle
    this.setFramebufferRectangle(cWidth, cHeight)

    // Tone-mapping
    gl.bindTexture(gl.TEXTURE_2D, outputTexture)
    this.setFramebuffer(this.pingpong[1].fb, cWidth, cHeight)
    gl.uniform1f(this.passUniformLocation, FRAGMENT_PASS_TONEMAP)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
    outputTexture = this.pingpong[1].rbuf
    gl.bindTexture(gl.TEXTURE_2D, null)

    // Finally, draw the finished image onto the canvas by setting framebuffer
    // to null (= the canvas).
    if (this.gl.canvas instanceof HTMLCanvasElement) {
      this.setFramebuffer(null, this.gl.canvas.clientWidth, this.gl.canvas.clientHeight)
    } else {
      this.setFramebuffer(null, this.gl.canvas.width, this.gl.canvas.height)
    }

    gl.bindTexture(gl.TEXTURE_2D, outputTexture)
    gl.uniform1f(this.passUniformLocation, FRAGMENT_PASS_PASSTHROUGH)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
    gl.bindTexture(gl.TEXTURE_2D, null)
  }

  /**
   * Performs a blur pass across the provides source texture. This uses the
   * "ping pong" strategy to progressively apply blur to the image.
   *
   * @param   {WebGLTexture}  sourceTexture  The image to be "bloomed."
   *
   * @return  {WebGLTexture}                 The texture to which the bloom has
   *                                         been applied.
   */
  private bloomPass (sourceTexture: WebGLTexture, nPasses = 32): WebGLTexture {
    const gl = this.gl
    const { cWidth, cHeight } = this.textureSize()

    // Apply the rectangle to draw the texture to (instead of our rays)
    this.setFramebufferRectangle(cWidth, cHeight)

    // Before anything, we need to produce a brightness map based on the source
    // texture. For this, we bind the SECOND ping pong, provide it the source
    // texture, and let the shader extract the brightness information. NOTE that
    // the brightness filter requires very bright HDR-colors, since it will only
    // extract the colors for a luminosity of >1.0.
    this.setFramebuffer(this.pingpong[1].fb, cWidth, cHeight)
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture)
    gl.uniform1f(this.passUniformLocation, FRAGMENT_PASS_BRIGHTNESS)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
    gl.bindTexture(gl.TEXTURE_2D, this.pingpong[1].rbuf)

    // Switch the fragment shader to blur-passing
    gl.uniform1f(this.passUniformLocation, FRAGMENT_PASS_BLUR)

    // Remember the last active texture from the pingpong pass so that we
    // extract the correct, final image. This allows us to customize what we
    // want to do with the pingpong buffers before entering the rendering loop.
    let lastActiveTexture: 0|1 = 0

    // Use the brightness-map to blur. We run nPasses * 2 times, because each
    // blur requires two passes over the image, once horizontally, and once
    // vertically.
    for (let pass = 0; pass < nPasses * 2; pass++) {
      // Tell the shader into which direction we should apply the blur.
      gl.uniform1i(this.blurHorizontalUniformLocation, pass % 2)
      this.setFramebuffer(this.pingpong[pass % 2]!.fb, cWidth, cHeight)
      gl.drawArrays(gl.TRIANGLES, 0, 6) // 6 coordinates
      // Set the texture from the current framebuffer as the active one to use
      // in the next pass.
      gl.bindTexture(gl.TEXTURE_2D, this.pingpong[pass % 2]!.rbuf)
      lastActiveTexture = pass % 2 //
    }

    // NOTE: Perform a xor, since 0^1==1 and  1^1==0
    this.setFramebuffer(this.pingpong[lastActiveTexture^1]!.fb, cWidth, cHeight)

    // Third step of the blooming: Merge the blurred one with the original
    // source image to produce the final result.
    gl.uniform1f(this.passUniformLocation, FRAGMENT_PASS_COMPOSITE)

    // For this final pass, the fragment shader needs two images. Specifically,
    // first the original source texture, and then the blurred image from the
    // ping-pong stage.
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture)
    gl.activeTexture(gl.TEXTURE0 + 1)
    gl.bindTexture(gl.TEXTURE_2D, this.pingpong[lastActiveTexture]!.rbuf)

    // Draw the composite image
    gl.drawArrays(gl.TRIANGLES, 0, 6) // 6 coordinates

    // Unbind textures again (because textures bound to one of the texture
    // points cannot be written to by the framebuffers in our next render pass).
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    // Return the texture we've written to so that other calls can use it.
    return this.pingpong[lastActiveTexture^1]!.rbuf
  }

  /**
   * Very simple routine to write the coordinates for a full-screen rectangle
   * into the vertex buffer. NOTE: This requires the position buffer to be
   * bound. Currently, we only have a single buffer, so this will work, but if
   * we ever add more vertex buffers, this becomes important.
   *
   * @param  {number}  width   The width of the rectangle
   * @param  {number}  height  The height of the rectangle
   */
  setFramebufferRectangle (width: number, height: number) {
    // Two triangles to make a rectangle
    const coords = new Float32Array([
      0.0, 0.0, width, 0.0, width, height,
      0.0, 0.0, width, height, 0.0, height
    ])
    this.gl.bufferData(this.gl.ARRAY_BUFFER, coords, this.gl.STATIC_DRAW)
  }
}
