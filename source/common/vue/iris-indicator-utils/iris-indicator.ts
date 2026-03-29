import { WebGLEngine, type Vec4, MAX_SUPPORTED_SEGMENTS } from './webgl-engine'
import { coordsForRay, mat3mul, translationMatrix, rotationMatrix, scaleMatrix } from './util/math'

export { type Vec4 } from './webgl-engine'

/**
 * Describes an individual ray. This struct holds all information the engine
 * needs to draw a single ray. It also includes all information necessary to
 * compute movement of the rays.
 */
interface Ray {
  /**
   * The radians of the ray (where it is located around the unit circle).
   */
  radians: number,
  /**
   * The width of the ray (will be set to be a bit overlapping)
   */
  width: number,
  /**
   * This is the meat of the ray movement: It remembers a randomly varied
   * minimum and maximum radius, plus a fixed inner radius, the current radius,
   * and whether the movement should go outwards (inc = true) or inwards
   * (inc = false).
   */
  radius: {
    inner: number;
    min: number;
    max: number;
    current: number;
    inc: boolean;
  }
}

/**
 * We consciously limit the amount of color options to some that can be decently
 * visually distinguished.
 */
export type BuiltInColor = 'blue'|'red'|'yellow'|'green'|'purple'

/**
 * This class creates and maintains an entire Iris indicator.
 */
export class IrisIndicator {
  /**
   * Indicates whether the engine should be rendering right now
   *
   * @var {boolean}
   */
  private isRendering: boolean
  /**
   * Holds the WebGL engine used to draw onto the canvas.
   *
   * @var {WebGLEngine}
   */
  private engine: WebGLEngine

  /**
   * The factor of rays to draw when the indicator should automatically adjust
   * the amount of rays based on the canvas size.
   *
   * @var {number}
   */
  private autoRayAdjustmentFactor: number

  /**
   * How many rays to draw
   *
   * @var {number}
   */
  private nRays: number

  /**
   * Should the indicator automatically adjust the number of rays to match the
   * current canvas size?
   *
   * @var {boolean}
   */
  private autoAdjustRays: boolean

  /**
   * How quickly should segments be animated towards their correct target ratio
   * if the ratios change (after calling `setSegments`)? This is given in
   * milliseconds per step.
   *
   * @var {number}
   */
  private segmentAdjustmentAnimationStepDuration: number

  /**
   * How many milliseconds should the entire indicator take to make a full turn
   * by 360°?
   *
   * @var {number}
   */
  private msPerRotation: number

  /**
   * How quickly should the rays move between their inner and outer radii?
   *
   * @var {number}
   */
  private rayMovementSpeed: number

  /**
   * Holds colors. Associates simple color names with actual color value vectors.
   */
  private readonly colormap: Record<BuiltInColor, Vec4>

  /**
   * Contains the counts associated with each of the four segments (i.e., how
   * large each segment should be rendered).
   */
  private segmentCounts: Vec4
  
  /**
   * Holds the target ratios for each of the four segments (how large they
   * should be once they are done animating).
   */
  private segmentRatiosTarget: Vec4

  /**
   * Holds the current ratios for each of the four segments that is used to
   * display them. Is constantly adjusted towards the target ratios for each
   * render cycle using an easing animation.
   */
  private segmentRatiosCurrent: Vec4

  /**
   * Specifies the colors to use for each segment (in RGBA 0-1).
   */
  private segmentColors: Vec4<Vec4>

  /**
   * Should the engine limit the FPS of the animation?
   */
  private fpsLimitEnabled: boolean

  /**
   * If the animation should limit the FPS, to how many should it limit? Note
   * that this internal variable holds the actual time-to-frame, not the frames
   * per second. Whenever you change the FPS limit the class will convert it to
   * ms per frame to save on calculation costs.
   */
  private fpsLimit: number

  /**
   * Holds the timings for each frame, for the last couple of frames. Can be
   * used to calculate the actual FPS with which the indicator is being
   * rendered, using a rolling average.
   */
  private frameTimings: number[]

  /**
   * Internal timestamp used to calculate the delta time between animations.
   */
  private timestamp: number

  /**
   * Internal timestamp used to calculate the delta time between animations.
   */
  private previousTimestamp: number|undefined

  /**
   * Flag set by the onResize handler to indicate to the drawing loop that the
   * canvas has changed. This synchronizes any recalculations to the frame
   * animation to ensure that there is no flickering.
   */
  private resizeOnNextDraw: boolean

  /**
   * Holds the actual rays to be rendered.
   */
  private rays: Ray[]

  /**
   * Creates a new iris indicator, to be rendered within the WebGL context of a
   * canvas.
   *
   * @param   {WebGL2RenderingContext}  gl  The context
   */
  constructor (gl: WebGL2RenderingContext) {
    this.isRendering = false
    this.engine = new WebGLEngine(gl)

    this.resizeOnNextDraw = false

    // FPS setup
    this.fpsLimitEnabled = true
    this.fpsLimit = Math.floor(1000/30)
    this.frameTimings = []

    // Animation setup
    this.segmentAdjustmentAnimationStepDuration = 100
    this.msPerRotation = 240_000
    this.rayMovementSpeed = 5_000

    // Segment setup
    this.colormap = {
      blue:   [ 0.2, 0.5, 1.0, 1.0 ],
      red:    [ 1.0, 0.3, 0.3, 1.0 ],
      green:  [ 0.3, 1.0, 0.3, 1.0 ],
      yellow: [ 1.0, 1.0, 0.3, 1.0 ],
      purple: [ 1.0, 0.3, 1.0, 1.0 ]
    }

    this.segmentCounts = [ 0, 0, 0, 0 ]
    this.segmentRatiosTarget = [ 0, 0, 0, 0 ]
    this.segmentRatiosCurrent = [ 0, 0, 0, 0 ]
    this.segmentColors = [
      this.colormap.red, this.colormap.green,
      this.colormap.blue, this.colormap.purple
    ]

    // Ray setup
    this.autoRayAdjustmentFactor = 5
    this.nRays = this.calculateOptimalRayCount()
    this.autoAdjustRays = true

    this.rays = []
    this.generateRays()
    this.setSegments()

    this.timestamp = Date.now()
  }

  /// SEGMENT SETTERS

  /**
   * Sets the colors to be used in the corona indicator. Choose one for each
   * from the provided colors.
   *
   * @param  {Vec4<BuiltinColor>}  colors  The colors to use for each segment
   */
  setColors (colors: Vec4<BuiltInColor>) {
    for (let i = 0; i < this.segmentColors.length; i++) {
      switch (colors[i]) {
        case 'blue':
          this.segmentColors[i] = this.colormap.blue
          break
        case 'green':
          this.segmentColors[i] = this.colormap.green
          break
        case 'purple':
          this.segmentColors[i] = this.colormap.purple
          break
        case 'red':
          this.segmentColors[i] = this.colormap.red
          break
        case 'yellow':
          this.segmentColors[i] = this.colormap.yellow
      }
    }

    this.setSegments()
  }

  /**
   * Sets the segment adjustment step duration in Milliseconds. What this means
   * is that each `duration`ms, the segments will be moved closer towards their
   * target size. Note, however, that the actual duration is longer, since the
   * step sizes will be smaller to produce an easing effect.
   *
   * @param   {number}  duration  The duration in milliseconds. Default is 200.
   */
  setSegmentAdjustmentStepDuration (duration: number) {
    this.segmentAdjustmentAnimationStepDuration = duration
  }

  /**
   * Set the current element counts to be displayed in the corona indicator.
   *
   * @param  {number[]}  counts  The amount for each segment. Must be absolute.
   */
  setSegmentCounts (counts: Vec4<number>) {
    let sum = 0
    for (let i = 0; i < this.segmentCounts.length; i++) {
      this.segmentCounts[i] = counts[i]
      sum += counts[i]
    }

    if (sum === 0) {
      this.segmentRatiosTarget = [ 0, 0, 0, 0 ]
    } else {
      // @ts-expect-error TS cannot determine that Vec4 is indeed four numbers.
      this.segmentRatiosTarget = this.segmentCounts.map(c => c / sum)
    }

    this.setSegments()
  }

  // Writes the current segment information into the renderer
  setSegments () {
    const segs: Array<{ color: Vec4, ratio: number }> = []
    for (let i = 0; i < this.segmentCounts.length; i++) {
      segs.push({ color: this.segmentColors[i], ratio: this.segmentRatiosCurrent[i] })
    }

    this.engine.setSegments(segs)
  }

  /**
   * Specify the number of rays to be drawn. NOTE: This disables the auto-
   * adjustment of the number of rays on resizing the canvas.
   *
   * @param   {number}  count  The number of rays to draw.
   */
  setRayCount (count: number) {
    this.autoAdjustRays = false
    this.nRays = count
  }

  /// ANIMATION SETTERS

  /**
   * Determines how fast the corona will rotate around the origin. Provide the
   * number of seconds for one full rotation. Default is 45 seconds. We
   * generally do not recommend a fast rate here.
   *
   * @param   {number}  seconds  The number of seconds per full rotation
   */
  setRotationSpeed (seconds: number) {
    this.msPerRotation = seconds * 1000
  }

  /**
   * Sets the ray movement speed in seconds. Each ray has an "inner" and an
   * "outer" radius, and it will oscillate between these two to provide more
   * movement to the animation. With this function, you can determine how many
   * seconds it will take for each ray to move from its minimum to its maximum
   * radius (and vice versa). The default is 5.
   *
   * @param   {number}  seconds  The number of seconds for one movement.
   */
  setRayMovementSpeed (seconds: number) {
    this.rayMovementSpeed = seconds * 1000
  }

  /**
   * This will set the renderer to automatically calculate the amount of rays to
   * be draawn.
   */
  enableAutomaticRayAdjustment () {
    this.autoAdjustRays = true
    this.nRays = this.calculateOptimalRayCount()
    this.generateRays()
  }

  /// EFFECTS SETTERS

  /**
   * Enables or disables the bloom on the renderer.
   *
   * @param   {boolean}  enabled  Whether bloom is enabled
   */
  setBloomEnabled (enabled: boolean) {
    this.engine.setBloomEnabled(enabled)
  }

  /**
   * Sets the intensity of the bloom effect
   *
   * @param  {1|2|4|8}  intensity  The wanted intensity
   */
  setBloomIntensity (intensity: 1|2|4|8) {
    this.engine.setBloomIntensity(intensity)
  }

  /**
   * Enables or disables MSAA.
   *
   * @param   {boolean}  enabled  Whether MSAA is enabled
   */
  setMSAAEnabled (enabled: boolean) {
    this.engine.setMSAAEnabled(enabled)
  }

  /**
   * Sets the rendering resolution/texture size modifier. The higher, the more
   * resource heavy, but also the sharper the result, especially with MSAA on.
   *
   * @param   {number}  mod  The modifier
   */
  setTextureSizeModifier (mod: number) {
    this.engine.setTextureSizeModifier(mod)
    this.onResize() // We need to recalculate the textures
  }

  /// FPS SETTERS

  /**
   * Enables or disables the FPS limiter
   *
   * @param   {boolean}  enabled  Whether the FPS limiter should be enabled
   */
  setFpsLimitEnabled (enabled: boolean) {
    this.fpsLimitEnabled = enabled
  }

  /**
   * Sets the FPS limit (common values are 30 or 60). Default is 30.
   *
   * @param   {number}  fpsLimit  The new FPS limit.
   */
  setFpsLimit (fpsLimit: number) {
    this.fpsLimit = Math.floor(1000/fpsLimit) // Convert to MS per frame
  }

  /**
   * Returns the current average frames per second, sampled over the last 120 fps.
   *
   * @return  {number}  The average Fps
   */
  getCurrentFps (): number {
    const avgFps = this.frameTimings.length > 0
      ? this.frameTimings.reduce((p, c) => p + c, 0) / this.frameTimings.length
      : 0

    return avgFps
  }

  /// RENDERING LOOP CONTROLS

  /**
   * Callback function used to indicate to the indicator that the canvas size
   * has changed and the renderer should re-calculate various numbers.
   */
  onResize () {
    this.resizeOnNextDraw = true
  }

  /**
   * Main function: Call this to start rendering to the canvas.
   */
  enterRenderingLoop () {
    this.isRendering = true
    requestAnimationFrame(ts => this.loop(ts))
  }

  /**
   * Programmatically pauses the rendering
   */
  pauseRendering () {
    this.isRendering = false
  }

  /**
   * Main loop executor
   */
  private loop (timestamp: number) {
    if (!this.isRendering) {
      return
    }

    const deltaTime = this.previousTimestamp === undefined ? 0 : timestamp - this.previousTimestamp

    if (this.fpsLimitEnabled) {
      if (deltaTime > 0 && deltaTime < this.fpsLimit) {
        return requestAnimationFrame(ts => this.loop(ts))
      }
    }

    // We must update the time HERE, because otherwise our fps counts and
    // limiting would be off.
    this.previousTimestamp = timestamp

    this.frameTimings.push(deltaTime > 0 ? 1000/deltaTime : 0)
    while (this.frameTimings.length > 120) {
      this.frameTimings.shift()
    }

    this.drawFrame()

    requestAnimationFrame(ts => this.loop(ts))
  }

  /**
   * Calculates the optimal amount of rays based on the current canvas size. The
   * various calculations have been empirically determined.
   *
   * @return  {number}  The number of rays that would look good at the current
   *                    resolution.
   */
  private calculateOptimalRayCount (): number {
    const { cWidth, cHeight } = this.engine.textureSize()
    const smallestEdge = Math.min(cWidth, cHeight)
    const wantedRayCount = Math.round(smallestEdge / this.autoRayAdjustmentFactor)
    return Math.max(wantedRayCount, 16)
  }

  /**
   * This routine actually calculates everything whenever a resize command is
   * issued.
   */
  private doResizeCalculation () {
    this.resizeOnNextDraw = false
    this.engine.onResize()
    if (this.autoAdjustRays) {
      this.nRays = this.calculateOptimalRayCount()
    }
    this.generateRays()
  }

  /**
   * (Re-)generate the rays to be displayed.
   */
  private generateRays () {
    // We want to display an iris. For that, we need pure triangles.
    // We compute them here, and then perform only a bit of adjustment during
    // the rendering.
    this.rays = []

    const { cWidth, cHeight } = this.engine.textureSize()
    
    // Draw a clock-like structure
    const canvasDiameter = Math.min(cWidth, cHeight)
    const canvasRadius = canvasDiameter / 2
    const outerRadius = 1.0 * canvasRadius
    const innerRadius = 0.3 * canvasRadius
    const minVaryRadius = 0.6 * canvasRadius
    // Each "tick" will be one radian on the unit circle. We want the tris to
    // overlap at their base so that they appear close together at their actual
    // inner start radius. We have three rads per tri (two bottom, one middle
    // top). Furthermore, we have to increase the tick size based on the inner
    // radius (so that the tris touch there). Note that the 3 is an arbitrary
    // number. It is fine if the tris overlap more. The importance is that
    // visually they form a ring at the center.
    const overlapFactor = 3 // Should be > 1
    const widthInRadians = ((2 * Math.PI) / (this.nRays * 3)) * overlapFactor

    for (let i = 0; i < this.nRays; i++) {
      // Position (in % of a circle)
      const pos = i / this.nRays
      // Determine the center of the ray in radians
      const centerInRad = pos * 2 * Math.PI

      // Vary the radii of each ray so that we have some movement.
      const RADIUS_VARIATION = 0.1
      const rMin = minVaryRadius + Math.random() * RADIUS_VARIATION * canvasRadius
      const rMax = outerRadius - Math.random() * RADIUS_VARIATION * canvasRadius
      const startRadius = minVaryRadius + (rMax - rMin) * Math.random()

      this.rays.push({
        // Save some state to make regeneration of the coords easier
        radians: centerInRad, width: widthInRadians,
        // Save some state into the tri so that we can change the size dynamically
        radius : { inner: innerRadius, min: rMin, max: rMax, current: startRadius, inc: Math.random() > 0.5 }
      })
    }
  }

  /**
   * This routine actually draws a frame by performing any update calculations
   * and perusing the WebGL rendering engine to draw the data onto the screen.
   */
  private drawFrame () {
    // Movement only depends on actually passed time.
    const now = Date.now()
    const deltaMs = now - this.timestamp
    this.timestamp = now

    // If we have a signal to resize, we need to do so now before drawing again.
    if (this.resizeOnNextDraw) {
      this.doResizeCalculation()
    }

    // Determine by how much we should adjust the target ratios for the
    // segments.
    const step = deltaMs / this.segmentAdjustmentAnimationStepDuration

    // SEGMENT ROTATION (time-dependent)
    let hasRatioChanged = false
    for (let i = 0; i < MAX_SUPPORTED_SEGMENTS; i++) {
      const cur = this.segmentRatiosCurrent[i]!
      const tar = this.segmentRatiosTarget[i]!

      if (cur === tar) {
        continue
      }

      hasRatioChanged = true

      // Adjust current closer to target
      const direction = cur > tar ? -1 : 1
      const difference = Math.abs(tar - cur) // absolute difference

      // To avoid infinite segment updates (and thus unnecessary updates), we
      // "snap" to the target ratio if the difference becomes very small.
      if (difference < 10e-4) {
        this.segmentRatiosCurrent[i] = tar
      } else {
        // By moving by just a fraction of the remaining difference, we
        // effectively produce an easing animation that starts very fast and
        // slows down as the difference to the target is reduced.
        this.segmentRatiosCurrent[i]! += direction * step * difference
      }
    }

    if (hasRatioChanged) {
      this.setSegments()
    }

    // MODIFY RAYS
    // Speed says how quickly each ray moves between its minimum and maximum radius.
    const speed = deltaMs / this.rayMovementSpeed
    for (const ray of this.rays) {
      const { min, max } = ray.radius
      let { current, inc } = ray.radius
      const increment = (max - min) * speed
      current = inc ? current + increment : current - increment
      if (current <= min) {
        current = min
        inc = true
      } else if (current >= max) {
        current = max
        inc = false
      }

      ray.radius = { ...ray.radius, current, inc }
    }

    const data = this.rays
      .map(({ radians, width, radius }) => {
        return coordsForRay(radians, width, radius.inner, radius.current)
      })
      .flatMap(coords => coords)

    // All elements / 2 (coordinates) / number of elements
    // --> One component is two numbers (coordinates)
    const componentsPerTri = 3
    const triangleData = new Float32Array(data)

    const nComponents = componentsPerTri * this.rays.length

    // ROTATION MATRIX PREPARATION (time-dependent)
    const rot = now % this.msPerRotation / this.msPerRotation // Clamp between 0 and 1
    const moveByRadians = -rot * (2 * Math.PI) // Move "backwards" (=clockwise)

    // TRANSLATION MATRIX PREPARATION
    const { cWidth, cHeight } = this.engine.textureSize()
    const originX = cWidth / 2
    const originY = cHeight / 2

    const matTemp = mat3mul(
      translationMatrix(originX, originY),
      rotationMatrix(moveByRadians)
    )

    const mat = mat3mul(
      matTemp,
      scaleMatrix(1, 1)
    )

    // Provide the calculated data to the engine to actually draw everything.
    this.engine.draw(triangleData, nComponents, mat)
  }
}
