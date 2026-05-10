/**
 * Defines a simple 3d-matrix type
 */
export type Mat3 = [
  number, number, number,
  number, number, number,
  number, number, number
]

/**
 * Calculates a triangle based on some information on a ray.
 *
 * @param  {number}  radians      The circule position of the ray
 * @param  {number}  width        The width of the ray at its base (in radians/2)
 * @param  {number}  innerRadius  The inner radius of the ray
 * @param  {number}  outerRadius  The outer radius of the ray
 */
export function coordsForRay (radians: number, width: number, innerRadius: number, outerRadius: number) {
  const [ rad1, rad2, rad3 ] = [ radians - width, radians, radians + width ]
  // Each tri needs three coordinates
  const [
    x1, y1, x2, y2, x3, y3
  ] = [
    // NOTE: These coordinates need to go around the tri in order!
    // NOTE 2: We do not translate them here away from the origin, because that's
    // what our translation matrix does in the render loop
    Math.cos(rad1) * innerRadius, Math.sin(rad1) * innerRadius,
    Math.cos(rad2) * outerRadius, Math.sin(rad2) * outerRadius,
    Math.cos(rad3) * innerRadius, Math.sin(rad3) * innerRadius
  ]

  return [ x1, y1, x2, y2, x3, y3 ]
}

/**
 * Takes a translation coordinate (x/y) and creates a 3D-matrix which, when
 * multiplied with a position vector, will translate that vector by this amount.
 * Courtesy of WebGL fundamentals.
 *
 * @param   {number}  tx  The x-axis translation
 * @param   {number}  ty  The y-axis translation
 * @returns {Mat3}        The translation matrix
 */
export function translationMatrix (tx: number, ty: number): Mat3 {
  return [
    1, 0, 0,
    0, 1, 0,
    tx, ty, 1
  ]
}

/**
 * Takes a rotation in radians and produces a matrix that, when multiplied with
 * a position vector, will rotate this vector by this amount. Courtesy of WebGL
 * fundamentals.
 *
 * @param   {number}  rad  The angles to rotate around
 * @returns {Mat3}         The rotation matrix
 */
export function rotationMatrix (rad: number): Mat3 {
  const c = Math.cos(rad)
  const s = Math.sin(rad)
  return [
    c, -s, 0,
    s,  c, 0,
    0,  0, 1
  ]
}

/**
 * Takes two scale parameters and produces a matrix that, when multiplied with a
 * position vector, will scale this vector by this amount. Courtesy of WebGL
 * fundamentals.
 *
 * @param   {number}  sx  The width-scale
 * @param   {number}  sy  The height-scale
 *
 * @return  {Mat3}        The matrix
 */
export function scaleMatrix (sx: number, sy: number): Mat3 {
  return [
    sx, 0, 0,
    0, sy, 0,
    0,  0, 1
  ]
}

/**
 * Takes two matrices and multiplies them. Courtesy of WebGL fundamentals.
 *
 * @param   {Mat3}  mat1  Matrix one
 * @param   {Mat3}  mat2  Matrix two
 * @returns {Mat3}        The resulting matrix
 */
export function mat3mul (mat1: Mat3, mat2: Mat3): Mat3 {
  // Copied and adapted from the webglfundamentals example because that's just a
  // lot of boilerplate code. Thanks to whoever coded this up!
  const [ a00, a01, a02 ] = [ mat1[0 * 3 + 0]!, mat1[0 * 3 + 1]!, mat1[0 * 3 + 2]! ]
  const [ a10, a11, a12 ] = [ mat1[1 * 3 + 0]!, mat1[1 * 3 + 1]!, mat1[1 * 3 + 2]! ]
  const [ a20, a21, a22 ] = [ mat1[2 * 3 + 0]!, mat1[2 * 3 + 1]!, mat1[2 * 3 + 2]! ]
  const [ b00, b01, b02 ] = [ mat2[0 * 3 + 0]!, mat2[0 * 3 + 1]!, mat2[0 * 3 + 2]! ]
  const [ b10, b11, b12 ] = [ mat2[1 * 3 + 0]!, mat2[1 * 3 + 1]!, mat2[1 * 3 + 2]! ]
  const [ b20, b21, b22 ] = [ mat2[2 * 3 + 0]!, mat2[2 * 3 + 1]!, mat2[2 * 3 + 2]! ]
  return [
    b00 * a00 + b01 * a10 + b02 * a20,
    b00 * a01 + b01 * a11 + b02 * a21,
    b00 * a02 + b01 * a12 + b02 * a22,
    b10 * a00 + b11 * a10 + b12 * a20,
    b10 * a01 + b11 * a11 + b12 * a21,
    b10 * a02 + b11 * a12 + b12 * a22,
    b20 * a00 + b21 * a10 + b22 * a20,
    b20 * a01 + b21 * a11 + b22 * a21,
    b20 * a02 + b21 * a12 + b22 * a22
  ]
}
