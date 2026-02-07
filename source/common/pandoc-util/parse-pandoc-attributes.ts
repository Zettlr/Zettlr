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
  const parts: string[] = []

  if (attributes.id !== undefined) {
    parts.push('#' + attributes.id)
  }

  if (attributes.classes !== undefined) {
    parts.push(attributes.classes.map(v => '.' + v).join(' '))
  }

  if (attributes.properties !== undefined) {
    const properties = Object.entries(attributes.properties)
      .map(([ key, value ]) => {
        if (value !== undefined) {
          return (`${key}="${value}"`)
        }

        return key
      })
      .join(' ')

    parts.push(properties)
  }

  return parts.join(' ')
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
  if (attrString.startsWith('{')) {
    attrString = attrString.slice(1)
  }

  if (attrString.endsWith('}')) {
    attrString = attrString.slice(0, -1)
  }

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
      let value = match.groups.unquoted ?? match.groups.quoted ?? ''

      if (key.toLowerCase() === 'width') {
        if (/^\d+$/.test(value)) {
          value += 'px'
        }
      }

      if (key.toLowerCase() === 'height') {
        if (/^\d+$/.test(value)) {
          value += 'px'
        }
      }

      if (parsed.properties === undefined) {
        parsed.properties = {}
      }
      parsed.properties[key] = value
    }
  }

  return parsed
}
