import { transformSelectedText } from "./transform-selected-text";

/**
 * Remove spaces, as necessary, to ensure there are no spaces around any
 * emdashes in the selected text.
 *
 * @example `blush — manifold` ➡️ `blush—manifold`
 * @example `blush —manifold`  ➡️ `blush—manifold`
 * @example `blush— manifold`  ➡️ `blush—manifold`
 * @example `blush—manifold`   ➡️ `blush—manifold`
 *
 * @param   {string}  text  The text to be transformed.
 *
 * @return  {string}        The text with spaces removed around emdashes where
 *                          necessary.
 */
export const removeSpacesAroundEmdashes = transformSelectedText((text) => {
  return text.replaceAll(/ +—/g, '—').replaceAll(/— +/g, '—')
})
