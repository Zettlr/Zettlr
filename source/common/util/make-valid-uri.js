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

const path = require('path')

const protocolRE = /^([a-z]{1,10}):\/\//i
const linkRE = /^[a-z0-9]+\.[a-z0-9]+/i
const mdFileRE = /[a-z0-9]+\.(?:md|markdown|txt)$/i

module.exports = function (uri, base = '') {
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
  // All of these examples can (in case of rel. paths with the base) be
  // resolved perfectly. The first two examples only need the http(s) protocol,
  // the other three examples need the base and file:// prepended.
  //
  // So what we need to do first is distinguish between a URL and a Path.

  // Set the isFile var to undefined
  let isFile

  // First, remove a potential protocol and save it for later use
  let protocol = protocolRE.exec(uri)
  // If there was a protocol, extract the capturing group
  if (protocol !== null) protocol = protocol[1]

  if (protocol === 'file') {
    // We know it's a file
    isFile = true
  } else if (uri.indexOf('//') === 0) {
    // We know it's a link to a file on a shared drive
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
    if (protocol !== null) {
      // It may be that the protocol is given, but not a file
      // In this case, it's not a file, but we don't care which
      // protocol it uses.
      isFile = false
    } else if (linkRE.test(uri) && !mdFileRE.test(uri)) {
      // NOTE: The regular expression will also test true for
      // relative paths without ./ at the beginning and a folder
      // containing a full stop. But remedification by adding ./
      // is easy in this case for the user.
      // NOTE: Using mdFileRE we prevent this behaviour for markdown-files
      // BUT beware: This will treat moldovian TLD domains as Markdown
      // files. Here, a trailing slash will remedify this.
      isFile = false
    } else {
      isFile = true
    }
  }

  // At this point, we definitely know the isFile. If the protocol
  // is still not known we can now derive it from the information
  // we have gathered so far.
  if (protocol === null) {
    if (isFile) {
      protocol = 'file'
    } else {
      // For links we assume HTTPS. Websites that still
      // don't use HTTPS by 2020 can go home.
      protocol = 'https'
    }
  }

  // Now we have both the protocol and whether it's a file
  // or not. If it's a file, one last thing we need to do
  // is check if we have to convert the path to absolute
  // using the current base.
  if (isFile) {
    // Again, extract a possible file-protocol
    if (uri.indexOf('file://') === 0) uri = uri.substr(7)
    // We've got a relative path
    if (!path.isAbsolute(uri)) uri = path.join(base, uri)
    uri = 'file://' + uri
  }

  // Now we can return the correct uri, made absolute
  if (!protocolRE.test(uri)) {
    return protocol + '://' + uri
  } else {
    return uri
  }
}
