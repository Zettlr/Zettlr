/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        YAML Frontmatter Linter
 * CVM-Role:        Linter
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This linter utilizes the YAML library's ability to collect
 *                  every error that it encounters while parsing a YAML
 *                  frontmatter.
 *
 * END HEADER
 */

import { syntaxTree } from '@codemirror/language'
import { linter, type Diagnostic } from '@codemirror/lint'
import { type EditorState } from '@codemirror/state'
import { type SyntaxNodeRef } from '@lezer/common'
import YAML from 'yaml'

/**
 * Takes a state and detects if there is a frontmatter. If so, it returns the
 * actual YAML content node (i.e., the CodeText node), i.e. it returns the node
 * that solely contains the actual YAML code, not the surrounding wrapper nodes.
 * It returns undefined if there is no YAML frontmatter in the file.
 *
 * @param   {EditorState}              state  The editor state
 *
 * @return  {SyntaxNodeRef|undefined}         Either the node, or undefined
 */
function findYamlFrontmatterNode (state: EditorState): SyntaxNodeRef|undefined {
  let returnNode: SyntaxNodeRef|undefined
  syntaxTree(state).iterate({
    enter (node) {
      if (returnNode !== undefined) {
        return false // Quickly end the iteration
      }

      if (node.name === 'FencedCode') {
        // The startNode identifies a YAML Frontmatter block ...
        const startNode = node.node.getChild('YAMLFrontmatterStart')
        // ... and the CodeText node contains the actual YAML frontmatter code.
        const codeNode = node.node.getChild('CodeText')
        if (startNode !== null && codeNode !== null) {
          returnNode = codeNode
        }
      }
    }
  })
  return returnNode
}

/**
 * Include this linter in a Markdown mode configuration to add diagnostics
 * indicating errors the user makes within YAML syntax (which is, to be frank,
 * scaringly easy).
 *
 * NOTE: If you need to lint an actual YAML document, please include the YAML
 * linter.
 *
 * @var {Extension}
 */
export const yamlFrontmatterLint = linter(async view => {
  const diagnostics: Diagnostic[] = []

  const frontmatterNode = findYamlFrontmatterNode(view.state)
  if (frontmatterNode === undefined) {
    return diagnostics
  }

  const content = view.state.sliceDoc(frontmatterNode.from, frontmatterNode.to)

  try {
    const document = YAML.parseDocument(content)
    for (const error of document.errors) {
      diagnostics.push({
        // NOTE that we have to offset the error code positions
        from: error.pos[0] + frontmatterNode.from,
        to: error.pos[1] + frontmatterNode.from,
        severity: 'error',
        source: `yaml-lint(${error.code})`,
        message: error.message,
        actions: []
      })
    }
    return diagnostics
  } catch (err: any) {
    console.error('Could not lint YAML: Linter threw an error', err)
  }

  return diagnostics
})
