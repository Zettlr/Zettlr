/**
 * Represents a parsed Pandoc LinkAttributes string (e.g., `{width=50%}`).
 */
export interface ParsedPandocAttributes {
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
 * Formats a `PandocAttributes` object into a useable HTML string.
 *
 * @param attributes
 */
export function formatPandocAttributes (attributes: ParsedPandocAttributes): string {
  const idString = attributes.id !== undefined ? '#' + attributes.id : ''
  const classesString = attributes.classes !== undefined ? '.' + attributes.classes.join(' .') : ''

  let propString = ''
  if (attributes.width !== undefined) {
    propString += ` width="${attributes.width}"`
  }

  if (attributes.height !== undefined) {
    propString += ` height="${attributes.height}"`
  }

  if (attributes.properties) {
    for (const key in attributes.properties) {
      let val = attributes.properties[key]

      if (key === 'style') {
        if (attributes.width !== undefined) {
          val += ` width: ${attributes.width};`
        }
        if (attributes.height !== undefined) {
          val += ` height: ${attributes.height};`
        }
      }

      if (val) {
        val = `="${val}"`
      }

      propString += ` ${key}${val}`
    }

    if (!attributes.properties['style']) {
      let style = ''
      if (attributes.width !== undefined) {
        style += ` width: ${attributes.width};`
      }
      if (attributes.height !== undefined) {
        style += ` height: ${attributes.height};`
      }

      if (style) {
        propString += ` style="${style}"`
      }
    }
  }

  return `${idString}${idString ? ' ' : '' + classesString}${propString}`
}

/** Pandoc Attribute Regex: {#my-id .classes .other-classes key=value attr="other value"}
 *
 *  #(?<id>[\w\-_]+)       => id
 *  \.(?<class>[\w\-_]+)   => class
 *  (?<key>[\w\-_]+)       => key
 *  "(?<quoted>[^"]*)"     => quoted values
 *  (?<unquoted>[^\s"]+)   => unquoted values
 */
const pandocAttributeRe = /#(?<id>[\w\-_]+)|\.(?<class>[\w\-_]+)|(?<attr>(?<key>[\w\-_]+)=(?:"(?<quoted>[^"]*)"|(?<unquoted>[^\s"]+)))/g

/**
 * Parses a Pandoc link attribute string, as defined in
 * https://pandoc.org/MANUAL.html#extension-link_attributes.
 *
 * @param   {string}  attrString  The attribute string (e.g., `{width=50%}`)
 *
 * @return  {ParsedPandocAttributes}  The parsed string
 */
export function parsePandocAttributes (attrString: string): ParsedPandocAttributes {
  attrString = attrString.trim()
  if (!attrString.startsWith('{') || !attrString.endsWith('}')) {
    // NOTE: In response to issue #6110, I realized that we really should not
    // throw the error here, because this function is also called in certain
    // contexts (here: With the TableEditor active) where throwing this error
    // would completely abort parsing of an entire file. So we only log it and
    // return an empty Record.
    console.error(new Error('Invalid Pandoc link attributes string: Not surrounded by curly braces'))
    return {}
  }

  attrString = attrString.substring(1, attrString.length - 1)

  const parsed: ParsedPandocAttributes = {}

  let match
  while ((match = pandocAttributeRe.exec(attrString)) !== null) {
    // If there are no groups, then something went wrong
    if (!match.groups) { break }

    if (match.groups.id) {
      parsed.id = match.groups.id
    }

    if (match.groups.class) {
      if (parsed.classes === undefined) {
        parsed.classes = []
      }
      parsed.classes.push(match.groups.class)
    }

    if (match.groups.attr) {
      const key = match.groups.key
      const value = match.groups.unquoted ?? match.groups.quoted ?? ''

      if (key.toLowerCase() === 'width') {
        parsed.width = value
        if (/^\d+$/.test(value)) {
          parsed.width += 'px'
        }
        continue
      }

      if (key.toLowerCase() === 'height') {
        parsed.height = value
        if (/^\d+$/.test(value)) {
          parsed.height += 'px'
        }
        continue
      }

      if (parsed.properties === undefined) {
        parsed.properties = {}
      }
      parsed.properties[key] = value
    }
  }

  return parsed
}
