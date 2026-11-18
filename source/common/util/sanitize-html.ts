/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        sanitizeHTML
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Provides a simple wrapper around DOMPurify with default configuration.
 *
 * END HEADER
 */
import DOMPurify from 'dompurify'

/**
 * Sanitizes the provided HTML string and prepare it for insertion into the DOM.
 * This function uses DOMPurify, but configures it so that it works for the
 * context of Zettlr.
 *
 * @param   {string}  html  The dirty HTML
 *
 * @return  {string}        The cleaned HTML
 */
export function sanitizeHTML (html: string) {
  return DOMPurify.sanitize(html, {
    // Allow tags that Zettlr uses
    ADD_TAGS: ['cds-icon'],
    // NOTE: This is the default regexp from DomPurify, but with our safe-file
    // addition to keep safe-files within Zettlr.
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|safe\-file):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
  })
}
