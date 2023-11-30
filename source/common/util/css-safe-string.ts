/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This function transforms an arbitrary string into a string
 *                  that is safe to use in CSS class names. It is being used in
 *                  the markdown-zkn mode as well as the clickable-yaml-tags
 *                  plugin, both defined in the main editor.
 *
 * END HEADER
 */

/**
 * Takes a string as input and sanitizes it for usage in a CSS class name or
 * identifier. It may return an empty string in case the input does not contain
 * any allowed characters.
 *
 * @param   {string}  unsaneText  The string to sanitize for CSS
 *
 * @return  {string}              The sane string
 */
export default function cssSafeString (unsaneText: string): string {
  // From the W3C (https://www.w3.org/TR/CSS21/syndata.html#characters):
  //
  // > In CSS, identifiers (including element names, classes, and IDs in
  // > selectors) can contain only the characters [a-zA-Z0-9] and ISO 10646
  // > characters U+00A0 and higher, plus the hyphen (-) and the underscore (_);
  // > they cannot start with a digit, two hyphens, or a hyphen followed by a
  // > digit.
  //
  // To keep it simple, we only allow [a-zA-Z0-9], hyphens, and underscores.
  return unsaneText
    .toLowerCase()
    // Spaces --> Hyphens
    .replace(/\s/g, '-')
    // Remove anything non-a-z0-9
    .replace(/[^a-z0-9-_]/g, '')
    // Replace a leading digit with underscore
    .replace(/^\d/, '_')
    // Replace two leading hyphens with underscores
    .replace(/^--/, '__')
    // Replace a leading hyphen-digit combo with underscores
    .replace(/^-\d/, '__')
}
