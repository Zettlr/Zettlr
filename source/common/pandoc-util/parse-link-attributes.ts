/**
 * Represents a parsed Pandoc LinkAttributes string (e.g., `{width=50%}`).
 */
export interface ParsedPandocLinkAttributes {
  /**
   * The ID, if present (`#id`)
   */
  id?: string
  /**
   * Any classes found in the string (e.g., `.class`)
   */
  classes?: string[]
  /**
   * The `width`-property, if present
   */
  width?: string
  /**
   * The `height`-property, if present
   */
  height?: string
  /**
   * Any additional properties. NOTE: This parser does not, unlike Pandoc's
   * parser, distinguish between HTML5 properties and custom-properties.
   */
  properties?: Record<string, string>
}

/**
 * Parses a Pandoc link attribute string, as defined in
 * https://pandoc.org/MANUAL.html#extension-link_attributes.
 *
 * @param   {string}  attrString  The attribute string (e.g., `{width=50%}`)
 *
 * @return  {ParsedPandocLinkAttributes}  The parsed string
 */
export function parseLinkAttributes (attrString: string): ParsedPandocLinkAttributes {
  attrString = attrString.trim()
  if (!attrString.startsWith('{') || !attrString.endsWith('}')) {
    throw new Error('Invalid Pandoc link attributes string: Not surrounded by curly braces')
  }

  attrString = attrString.substring(1, attrString.length - 1)

  const elements = attrString.split(/\s+/)
  const parsed: ParsedPandocLinkAttributes = {}

  for (const element of elements) {
    if (element.startsWith('#')) {
      parsed.id = element.substring(1)
    } else if (element.startsWith('.')) {
      if (parsed.classes === undefined) {
        parsed.classes = []
      }
      parsed.classes.push(element.substring(1))
    } else if (element.includes('=') && element.length >= 3) {
      const [ key, value ] = element.split('=', 2).map(e => e.trim())
      if (key.toLowerCase() === 'width') {
        parsed.width = value
        if (/^\d+$/.test(value)) {
          parsed.width += 'px'
        }
      } else if (key.toLowerCase() === 'height') {
        parsed.height = value
        if (/^\d+$/.test(value)) {
          parsed.height += 'px'
        }
      } else {
        if (parsed.properties === undefined) {
          parsed.properties = {}
        }
        parsed.properties[key] = value
      }
    } else {
      // Wrong/unsupported attribute.
    }
  }

  return parsed
}
