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
  // We will use the hostname to differentiate a few pages where we can do
  // better than just looking at the meta arguments; most prominently:
  // Wikipedia articles.
  const url = new URL(rawUrl)

  // First, we need to fetch the HTML of the page
  const result = await got(rawUrl)
  const body = result.body

  // Next, we can retrieve the title of the website
  const title = body.match(/<title>(.+?)<\/title>/)
  if (title !== null) {
    returnValue.title = title[1]
  } else {
    throw new Error(`Could not fetch preview for URL ${rawUrl}: No title field found.`)
  }

  // Extract all meta properties where we can find some of the info we want
  const meta: Record<string, string> = {}
  for (const match of body.matchAll(/<meta.+?(?:name|property)="(.+?)".+?content="(.+?)".*?>/gi)) {
    meta[match[1]] = match[2]
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
  } else if ('description' in meta) {
    // Otherwise, regular treatment
    returnValue.summary = meta.description
  }

  return returnValue
}
