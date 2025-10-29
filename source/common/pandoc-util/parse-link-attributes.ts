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
 * @return  {ParsedPandocLinkAttributes}  The parsed string
 */
export function parseLinkAttributes (attrString: string): ParsedPandocLinkAttributes {
  attrString = attrString.trim()
  if (!attrString.startsWith('{') || !attrString.endsWith('}')) {
    throw new Error('Invalid Pandoc link attributes string: Not surrounded by curly braces')
  }

  attrString = attrString.substring(1, attrString.length - 1)

  const parsed: ParsedPandocLinkAttributes = {}

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
      const value = match.groups.unquoted ?? match.groups.quoted

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
