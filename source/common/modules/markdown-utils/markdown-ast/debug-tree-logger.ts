import { type SyntaxNode } from '@lezer/common'

export interface LogTreeOptions {
  /**
   * Whether to log the root node in a separate section above the tree. Default
   * false.
   */
  logRoot: boolean
  /**
   * Whether to log the various pieces. Can look ugly, depending on the tree.
   * Default false.
   */
  logNodes: boolean
  /**
   * The Markdown source. Only required if you want to log the actual node
   * contents.
   */
  markdown?: string
  /**
   * Optionally define a baseIndent for the root node.
   */
  baseIndent: number
  /**
   * By how much should child nodes be indented from their parent? Default 2
   */
  indentIncrement: number
}

/**
 * Oftentimes, the parser trees can be very complex. If one wants to visualize
 * them to understand how a parser treats specific situations, this function can
 * be used to log the corresponding SyntaxTree.
 *
 * @param  {SyntaxNode}      rootNode  The root node of the (partial) tree
 * @param  {LogTreeOptions}  options   Options for the logger
 */
export function logLezerTree (rootNode: SyntaxNode, options?: Partial<LogTreeOptions>): void {
  // Set defaults
  options = options ?? {}
  options.baseIndent = options.baseIndent ?? 0

  // Log warnings once if the options are incompatible.
  if (options.logRoot === true && options.markdown == null && options.baseIndent === 0) {
    console.warn('Cannot log full table: No Markdown source was provided.')
  }
  if (options.logNodes === true && options.markdown == null && options.baseIndent === 0) {
    console.warn('Cannot log nodes: No Markdown source was provided.')
  }

  if (options.baseIndent === 0 && options.logRoot === true && options.markdown != null) {
    console.log('-'.repeat(80))
    console.log('\x1b[32m' + options.markdown.slice(rootNode.from, rootNode.to) + '\x1b[0m')
    console.log('-'.repeat(80))
  }

  let toLog = ' '.repeat(options.baseIndent) + '\x1b[36;1m' + rootNode.name + '\x1b[0m'
  if (options.baseIndent > 0 && options.logNodes === true && options.markdown != null) {
    toLog += ' '.repeat(40 - toLog.length) + '\x1b[32;4m' + options.markdown.slice(rootNode.from, rootNode.to).replace(/\n/g, '⏎') + '\x1b[0m'
  }
  console.log(toLog)

  let child = rootNode.firstChild
  while (child !== null) {
    logLezerTree(child, { ...options, baseIndent: options.baseIndent + (options.indentIncrement ?? 2) })
    child = child.nextSibling
  }
}
