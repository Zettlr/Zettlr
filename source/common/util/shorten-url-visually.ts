/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Visual URL shortener
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This function does its best to properly shorten the given
 *                  URL visually so that it fits within, e.g., a fixed-width
 *                  container
 *
 * END HEADER
 */

/**
 * Takes a long URL and shortens it as best as possible so that it can be
 * presented with as much information as possible to the user given the length
 * requirement (default: 80 characters). If url is shorter than that, the
 * function returns the url unchanged, if it's a valid URL, it will try various
 * heuristics to shorten the URL without hiding too much information on the
 * origin of the URL, and if it's not a valid URL, it will return a possibly
 * improperly truncated URL.
 *
 * @param  {string}  url        The URL to shorten
 * @param  {number}  maxLength  The maximum number of characters for the
 *                              shortened URL
 *
 * @return {string}             The URL in a way that fits maxLength
 */
export function shortenUrlVisually (url: string, maxLength: number = 80): string {
  // Plain links need to be surrounded by <>, so we can definitely remove those
  // if present.
  url = url.replace(/^<(.+)>$/, '$1')
  if (url.length <= maxLength) {
    return url
  }

  try {
    const parsedUrl = new URL(url)
    const {
      origin, // https://www.example.com
      hostname, // www.example.com
      pathname, // /some/subsite.php
      protocol // https:
    } = parsedUrl

    if (origin.length + pathname.length <= maxLength) {
      return origin + pathname
    } else if (hostname.length + pathname.length <= maxLength && /https?:/.test(protocol)) {
      // Only hostname works, and protocol is known
      return parsedUrl.hostname + pathname
    } else if (hostname.length < maxLength) {
      // Truncate path length
      const remaining = maxLength - hostname.length
      return hostname + '/…' + pathname.slice(-remaining)
    } else {
      // We cannot really accommodate maxLength, so just do a brutal truncate
      return hostname.slice(0, maxLength)
    }
  } catch (err: any) {
    // Fallback: Not a valid URL
    const half = Math.floor(maxLength / 2)
    return url.slice(0, half) + '…' + url.slice(-half)
  }
}
