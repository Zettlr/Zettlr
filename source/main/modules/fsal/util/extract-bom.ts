/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        extractBOM function
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Extracts optional Byte Order Marks from a string of text
 *
 * END HEADER
 */

/**
 * A utility function that can extract a BOM from a text.
 *
 * @param   {string}  text  The text to be tested for the presence of a BOM
 *
 * @return  {string}        The BOM, or an empty string if none was found
 */
export default function extractBOM (text: string): string {
  if (text.length < 2) {
    return '' // A BOM is at least two bytes long
  }

  // charCodeAt will return NaN if a buffer overflow occurs,
  // so we can skip extensive length checks
  const b1 = text.charCodeAt(0)
  const b2 = text.charCodeAt(1)
  const b3 = text.charCodeAt(2)
  const b4 = text.charCodeAt(3)

  // Byte orders are from https://en.wikipedia.org/wiki/Byte_order_mark#Byte_order_marks_by_encoding

  if (b1 === 239 && b2 === 187 && b3 === 191) {
    // Contains a UTF-8 BOM (EF BB BF)
    return String.fromCharCode(b1, b2, b3)
  } else if (b1 === 254 && b2 === 255) {
    // Contains a UTF-16 BE BOM (FE FF)
    return String.fromCharCode(b1, b2)
  } else if (b1 === 255 && b2 === 254) {
    // Contains a UTF-16 LE BOM (FF FE)
    return String.fromCharCode(b1, b2)
  } else if (b1 === 0 && b2 === 0 && b3 === 254 && b4 === 255) {
    // Contains a UTF-32 BE BOM (00 00 FE FF)
    return String.fromCharCode(b1, b2, b3, b4)
  } else if (b1 === 255 && b2 === 254 && b3 === 0 && b4 === 0) {
    // Contains a UTF-32 LE BOM (FF FE 00 00)
    return String.fromCharCode(b1, b2, b3, b4)
  } else if (b1 === 43 && b2 === 47 && b3 === 118) {
    // Contains a UTF-7 BOM (2B 2F 76)
    return String.fromCharCode(b1, b2, b3)
  } else if (b1 === 247 && b2 === 100 && b3 === 76) {
    // Contains a UTF-1 BOM (F7 64 4C)
    return String.fromCharCode(b1, b2, b3)
  } else if (b1 === 221 && b2 === 115 && b3 === 102 && b4 === 115) {
    // Contains a UTF-EBCDIC BOM (DD 73 66 73)
    return String.fromCharCode(b1, b2, b3, b4)
  } else if (b1 === 14 && b2 === 254 && b3 === 255) {
    // Contains an SCSU BOM (0E FE FF)
    return String.fromCharCode(b1, b2, b3)
  } else if (b1 === 251 && b2 === 238 && b3 === 40) {
    // Contains a BOCU-1 BOM (FB EE 28)
    return String.fromCharCode(b1, b2, b3)
  } else if (b1 === 132 && b2 === 49 && b3 === 149 && b4 === 51) {
    // Contains a GB-18030 BOM (84 31 95 33)
    return String.fromCharCode(b1, b2, b3, b4)
  }

  return '' // No BOM
}
