import { transformSelectedText } from "./transform-selected-text";

/**
 * Add spaces, as necessary, to ensure spaces exist around any emdashes in the
 * selected text.
 *
 * @example `blush—manifold`   ➡️ `blush — manifold`
 * @example `blush —manifold`  ➡️ `blush — manifold`
 * @example `blush— manifold`  ➡️ `blush — manifold`
 * @example `blush — manifold` ➡️ `blush — manifold`
 *
 * @param   {string}  text  The text to be transformed.
 *
 * @return  {string}        The text with spaces added around emdashes where
 *                          necessary.
 */
export const addSpacesAroundEmdashes = transformSelectedText((text) => {
  return text.replaceAll(/([^ ])—/g, '$1 —').replaceAll(/—([^ ])/g, '— $1')
})
