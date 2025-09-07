/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        makeValidURI function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Small helper function that tries
 *                  to return a valid URI.
 *
 * END HEADER
 */

// NOTE: fileExists is called "isFile" everywhere else, we have just renamed
// it because of a naming conflict in the function.
import { getProtocolRE, getLinkRE } from '../regular-expressions'
import { isAbsolutePath, resolvePath } from './renderer-path-polyfill'

const protocolRE = getProtocolRE()
const linkRE = getLinkRE()
const emailRe = /^[a-z0-9-.]+@[a-z0-9-.]+\.[a-z0-9-.]{2,}$/i

// This regular expression checks whether an URI could be linking to a local file
// const anyLocallyLinkableFileRE = /.+\.(?:md|markdown|txt|rmd)$/i
const linkableFileRE = /.+\.(?:mdx?|markdown|txt|(?:q|r)md|jpe?g|png|gif|svg|bmp|webp)$/i

/**
 * Returns a valid URI, using the available context information
 *
 * @param   {string}  uri   The URI to check
 * @param   {string}  base  The base which can be used to make uri absolute
 *
 * @return  {string}        The absolute, parsed string.
 */
export default function makeValidUri (uri: string, base: string = ''): string {
  // Why do we need a helper function for this?
  // Because it's not only hard to distinguish
  // a URL from a file path, but also there are
  // a lot of variables to account for.
  //
  // Examples:
  // github.com --> is a valid hostname, but has no protocol and no "www"
  // subdomain.toplevel.tld --> also valid, but without "www" and protocol
  // ./path/file.md --> Valid file path, but relative
  // path/file.md --> Also valid, also relative, but without the dot indicator
  // path/to/.htaccess --> Valid extension-only filepath
  //
  // All of these examples can (in case of relative paths with the base) be
  // resolved perfectly. The first two examples only need the http(s) protocol,
  // the other three examples need the base and file:// prepended.
  //
  // So what we need to do first is distinguish between a URL and a Path.

  // But before we do anything like that, we have to ensure that the URL that
  // gets passed in here is not surrounded with angle brackets. This is
  // perfectly valid, especially within Markdown documents, but of course these
  // serve only as delineators of URLs. Instead of dispersing this functionality
  // across the codebase, we can do this centrally here.
  uri = uri.replace(/^<(.+)>$/, '$1')

  // To reduce the function complexity, and since Windows also works with
  // forward slashes, let's add this normalization step here.
  uri = uri.replace(/\\/g, '/')

  // Shortcut for mailto-links, as these have a protocol (mailto) but with
  // *only* a colon, not the double-slash (//).
  if (uri.startsWith('mailto:')) {
    return (new URL(uri)).toString()
  } else if (emailRe.test(uri)) {
    return (new URL('mailto:' + uri)).toString()
  }

  if (uri.startsWith('//')) {
    // The URI looks like a network share. This is a complete can of worms, and
    // the URL constructor will complain about this, so just shortcircuit here
    // and let the recipient deal with it. NOTE that this will ensure that
    // the URL will start with four slashes. This is important to give the main
    // process a chance to detect that this is supposed to be a network share.
    // For more context, please see issue #5495
    return (new URL(`safe-file://${uri}`)).toString()
  }

  // Set the isFile var to undefined
  let isFile
  let protocol = ''

  try {
    const parsed = new URL(uri)
    if (parsed.protocol === 'file:') {
      isFile = true
      protocol = 'file'
      // "file" links could be relative, and we need to tend to that possibility
      // below, so even if this is a proper URL, we have to let the rest of the
      // functionality take over.
      throw new Error('Look at my smart programming lol')
    }
    return parsed.toString()
  } catch (err) {
    // We can trust the URL constructor to throw an error if it is not something
    // that a web browser can *immediately* open. So if new URL() doesn't throw,
    // we have a proper URL and can save us these shenanigans.
  }

  // First, remove a potential protocol and save it for later use
  const protoMatch = protocolRE.exec(uri)
  // If there was a protocol, extract the capturing group
  if (protoMatch !== null) {
    protocol = protoMatch[1]
  }

  if (protocol === 'file') {
    // We know it's a file
    isFile = true
  } else if (uri.startsWith('//') || uri.startsWith('./') || uri.startsWith('../')) {
    // We know it's a file (shared drive, or relative to this directory)
    isFile = true
  } else if (isAbsolutePath(uri)) {
    // The link is already absolute
    isFile = true
  }

  // At this point, it might be that isFile is still undefined. If so,
  // no protocol was being extracted, and it's up to us to find out
  // more.
  if (isFile === undefined) {
    // So, no explicit file protocol, which means we have to
    // check the first part of the URI. If it resembles a
    // valid URI, that is: something in the form <sub>.<host>.<tld>,
    // we assume a link. If not, we assume a file. Remember
    // that the subdomain may be omitted. So what we're really
    // searching for is <host>.<tld>.
    if (protocol !== '') {
      // It may be that the protocol is given, but not a file
      // In this case, it's not a file, but we don't care which
      // protocol it uses.
      isFile = false
    } else if (linkRE.test(uri) && !linkableFileRE.test(uri)) {
      // NOTE: The regular expression will also test true for
      // relative paths without ./ at the beginning and a folder
      // containing a full stop. But remedification by adding ./
      // is easy in this case for the user.
      // NOTE: Using linkableFileRE we prevent this behaviour for any file that
      // users could be linking locally (Markdown files and images).
      // BUT beware: This will treat moldovian TLD domains (or any TLD that can
      // double as a file extension) as files. Here, a trailing slash will
      // remedify this.
      isFile = false
    } else {
      isFile = true
    }
  }

  // At this point, we definitely know the isFile. If the protocol
  // is still not known we can now derive it from the information
  // we have gathered so far.
  if (protocol === '' && isFile) {
    protocol = 'file'
  } else if (protocol === '' && !isFile) {
    // For links we assume HTTPS. Websites that still
    // don't use HTTPS by 2020* can go home. (* 2023)
    protocol = 'https'
  }

  // Now we have both the protocol and whether it's a file
  // or not. If it's a file, one last thing we need to do
  // is check if we have to convert the path to absolute
  // using the current base.
  if (isFile) {
    // Again, extract a possible file-protocol
    if (uri.indexOf('file://') === 0) {
      uri = uri.substring(7)
    }

    // We've got a relative path
    if (!isAbsolutePath(uri)) {
      uri = resolvePath(base, uri)
    }

    // See https://github.com/Zettlr/Zettlr/issues/5489
    // I was very salty.
    if (process.platform === 'win32') {
      uri = `/${uri}`
    }

    protocol = 'safe-file'
  }

  // Now we can return the correct uri, made absolute
  if (!protocolRE.test(uri)) {
    return new URL(protocol + '://' + uri).toString()
  } else {
    return new URL(uri).toString()
  }
}
