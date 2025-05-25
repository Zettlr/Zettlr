/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        File extension check functions
 * CVM-Role:        Utility functions
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file provides the backbone for Zettlr's file detection.
 *                  It includes various functions to determine if paths or
 *                  filenames have proper file extensions as they can be handled
 *                  by Zettlr.
 *
 * END HEADER
 */

export const MD_EXT = [ '.md', '.rmd', '.qmd', '.markdown', '.txt', '.mdx', '.mkd' ]
export const CODE_EXT = [ '.tex', '.json', '.yaml', '.yml' ]
export const IMG_EXT = [ '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.tiff' ]
export const PDF_EXT = ['.pdf']
export const MS_OFFICE_EXT = [ '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx' ]
export const OPEN_OFFICE_EXT = [ '.odt', '.ods', '.odp' ]
export const DATA_EXT = [ '.csv', '.tsv', '.sav', '.zsav' ]

/**
 * Returns true if the given path has a valid Markdown or Code extension
 *
 * @param   {string}   p  The path to check
 *
 * @return  {boolean}     True or false
 */
export function hasMdOrCodeExt (p: string): boolean {
  return hasMarkdownExt(p) || hasCodeExt(p)
}

/**
 * Checks if the provided `filePath` has a filename extension from the list of
 * `extensions`.
 *
 * @param   {string}    filePath    The file path in question
 * @param   {string[]}  extensions  The list of filename extensions to check
 *
 * @return  {boolean}               Whether the file has one of these extensions
 */
function hasExt (filePath: string, extensions: string[]): boolean {
  return extensions.some(ext => filePath.endsWith(ext))
}

/**
 * Has the given path a valid Markdown file extension?
 *
 * @param   {string}   filePath  The path to check
 *
 * @return  {boolean}            True or false
 */
export function hasMarkdownExt (filePath: string): boolean {
  return hasExt(filePath, MD_EXT)
}

/**
 * Has the given path a valid Code file extension?
 *
 * @param   {string}   filePath  The path to check
 *
 * @return  {boolean}            True or false
 */
export function hasCodeExt (filePath: string): boolean {
  return hasExt(filePath, CODE_EXT)
}

/**
 * Has the given path a valid Image file extension?
 *
 * @param   {string}   filePath  The path to check
 *
 * @return  {boolean}            True or false
 */
export function hasImageExt (filePath: string): boolean {
  return hasExt(filePath, IMG_EXT)
}

/**
 * Has the given path a valid PDF file extension?
 *
 * @param   {string}   filePath  The path to check
 *
 * @return  {boolean}            True or false
 */
export function hasPDFExt (filePath: string): boolean {
  return hasExt(filePath, PDF_EXT)
}

/**
 * Has the given path a valid MS Office file extension?
 *
 * @param   {string}   filePath  The path to check
 *
 * @return  {boolean}            True or false
 */
export function hasMSOfficeExt (filePath: string): boolean {
  return hasExt(filePath, MS_OFFICE_EXT)
}

/**
 * Has the given path a valid Open Office file extension?
 *
 * @param   {string}   filePath  The path to check
 *
 * @return  {boolean}            True or false
 */
export function hasOpenOfficeExt (filePath: string): boolean {
  return hasExt(filePath, OPEN_OFFICE_EXT)
}

/**
 * Has the given path a valid Data file extension?
 *
 * @param   {string}   filePath  The path to check
 *
 * @return  {boolean}            True or false
 */
export function hasDataExt (filePath: string): boolean {
  return hasExt(filePath, DATA_EXT)
}
