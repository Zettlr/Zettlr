/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        fetchLinkPreview
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This function takes a URL and attempts to fetch a link
 *                  preview for it, taking into account OpenGraph meta
 *                  attributes and the like.
 *
 * END HEADER
 */

import got from 'got'
import { type IncomingHttpHeaders } from 'http2'

/**
 * This is the result that we
 */
export interface LinkPreviewResult {
  /**
   * The title of the website behind the given URL
   */
  title: string
  /**
   * A summary of the website. This can be the meta description property, or a
   * custom response, depending on what's implemented.
   */
  summary?: string
  /**
   * If given, this contains the preview image (either from og:image or twitter:image)
   */
  image?: string
}

interface MediaWikiAPIResponse {
  batchcomplete: string
  query: {
    pages: Record<string, {
      pageid: string
      ns: number
      title: string
      extract: string
    }>
  }
}

/**
 * Fetches the headers of rawUrl without downloading the content itself. This
 * keeps the data rate relatively low (albeit there is no way to prevent the
 * download altogether, so a few chunks will possibly always be downloaded).
 *
 * @param   {string}                        rawUrl  The URL to fetch headers for
 *
 * @return  {Promise<IncomingHttpHeaders>}          Resolves with the headers
 */
async function fetchHeaders (rawUrl: string): Promise<IncomingHttpHeaders> {
  return await new Promise((resolve, reject) => {
    // Initiate request
    const promise = got(rawUrl)

    // Hook three listeners: As soon as 'response' is fired the headers are
    // available and the download begins. At that point, resolve with the
    // headers and cancel the request to abort the download. Add an additional
    // then in case there is no body (because the promise resolution and the
    // event response will be simultaneous), and finally add a catch for good
    // measure.
    promise
      .on('response', response => {
        resolve(response.headers)
        promise.cancel()
      })
      .then(response => resolve(response.headers))
      .catch(err => reject(err))
  })
}

/**
 * Takes the headers of a HTTP response and returns true if the content type
 * field indicates that we can generate a preview for this.
 *
 * @param   {IncomingHttpHeaders}  headers  The headers
 *
 * @return  {boolean}                       Whether the content type is supported
 */
function isPreviewableContent (headers: IncomingHttpHeaders): boolean {
  const PREVIEWABLE_CONTENT_TYPES = [
    'text/html' // Regular HTML content
    // TODO: Also allow images at some point (requires a larger amount of
    // rewrite to this module) -- and maybe even other types.
    // Full list of mime types: https://www.iana.org/assignments/media-types/media-types.xhtml
  ]

  const contentType = headers['content-type']
  if (contentType === undefined) {
    return false // Possibly a misconfigured webserver
  }

  // The actual contentType must be in the form of type/subtype in the beginning
  // of the content type header.
  for (const type of PREVIEWABLE_CONTENT_TYPES) {
    if (contentType.startsWith(type)) {
      return true
    }
  }

  return false
}

/**
 * Attempts to fetch a few meta infos about the given rawUrl. This includes the
 * website's title, as well as an optional summary and (social media/preview)
 * image.
 *
 * @param   {string}                      rawUrl  The raw URL to visit
 *
 * @return  {Promise<LinkPreviewResult>}          The result of the query
 *
 * @throws No error handling within the function. You either get a full result
 * or none.
 */
export async function fetchLinkPreview (rawUrl: string): Promise<LinkPreviewResult> {
  const returnValue: LinkPreviewResult = {
    title: '',
    summary: undefined,
    image: undefined
  }

  // First, inspect the headers to see if we can even preview this piece of
  // information.
  const responseHeaders = await fetchHeaders(rawUrl)

  if (!isPreviewableContent(responseHeaders)) {
    throw new Error('Unsupported content type')
  }

  // We will use the hostname to differentiate a few pages where we can do
  // better than just looking at the meta arguments; most prominently:
  // Wikipedia articles.
  const url = new URL(rawUrl)

  // First, we need to fetch the HTML of the page
  const result = await got(rawUrl)
  const body = result.body

  // Next, we can retrieve the title of the website
  const title = body.match(/<title\s*>(.+?)<\/title\s*>/i)
  if (title !== null) {
    returnValue.title = title[1]
  } else {
    throw new Error('No title field found')
  }

  // Extract all meta properties where we can find some of the info we want
  const meta: Record<string, string> = {}
  for (const match of body.matchAll(/<meta .+?>/gi)) {
    // NOTE: We have to do a two-stage extraction, because otherwise badly
    // formatted websites can cause the entire app to lock up (catastrophic
    // backtracking, see issue #4883)
    const propMatches = [...match[0].matchAll(/(name|content)=(?:"(.+?)"|([^\s>]+))/gi)]
    const name = propMatches.find(m => m[1] === 'name')
    const content = propMatches.find(m => m[1] === 'content')
    if (name !== undefined && content !== undefined) {
      const key = name[2] ?? name[3]
      const value = content[2] ?? content[3]
      meta[key] = value
    }
  }

  // Now with the meta at hand, we can fill in the image property (possibly)
  if ('og:image' in meta) {
    returnValue.image = meta['og:image']
  } else if ('twitter:image' in meta) {
    returnValue.image = meta['twitter:image']
  } // Else: No image

  // Special treatment for Wikipedia pages
  if (url.hostname.endsWith('wikipedia.org') && url.pathname.startsWith('/wiki/')) {
    const title = url.pathname.slice(6)
    url.pathname = '/w/api.php'
    url.search = `format=json&action=query&prop=extracts&exintro&explaintext&redirects=1&titles=${title}`
    // We have a Wikipedia page. Here, we can get a better description by using
    // the API
    const result = await got(url.href)
    const body: MediaWikiAPIResponse = JSON.parse(result.body)
    returnValue.summary = Object.values(body.query.pages)[0].extract
  } else {
    // Otherwise, regular treatment
    returnValue.summary = meta['description'] ?? meta['og:description'] ?? meta['twitter:description']
  }

  if (returnValue.summary !== undefined && returnValue.summary.length > 300) {
    // Shorten overly long summary
    const shortened = returnValue.summary.slice(0, 300)
    if (shortened.includes('.')) {
      returnValue.summary = shortened.slice(0, shortened.lastIndexOf('.') + 1) + ' […]'
    } else {
      returnValue.summary = shortened + ' […]'
    }
  }

  return returnValue
}
