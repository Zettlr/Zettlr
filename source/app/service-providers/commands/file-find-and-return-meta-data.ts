/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FileFindAndReturnMetaData command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command finds the absolute path of a file, and returns
 *                  the file's meta data
 *
 * END HEADER
 */

import extractYamlFrontmatter from '@common/util/extract-yaml-frontmatter'
import ZettlrCommand from './zettlr-command'
import type { MDFileDescriptor } from '@dts/common/fsal'
import type { AppServiceContainer } from 'source/app/app-service-container'

const MAX_FILE_PREVIEW_LENGTH = 300
const MAX_FILE_PREVIEW_LINES = 10

function previewTitleGenerator (userConfig: string, descriptor: MDFileDescriptor): string {
  if (userConfig.includes('title')&& descriptor.yamlTitle !== undefined) {
    return descriptor.yamlTitle
  } else if (userConfig.includes('heading') && descriptor.firstHeading !== null) {
    return descriptor.firstHeading
  }
  return descriptor.name
}

export interface FindFileAndReturnMetadataResult {
  title: string
  filePath: string
  previewMarkdown: string
  wordCount: number
  modtime: number
}

export default class FilePathFindMetaData extends ZettlrCommand {
  constructor (app: AppServiceContainer) {
    super(app, [ 'find-exact', 'file-find-and-return-meta-data' ])
  }

  /**
   * This command serves two purposes: For the MarkdownEditor component, it
   * returns an easy to consume metadata object, and for the GraphView it offers
   * a convenient access to the internal link resolution engine to resolve links
   *
   * @param   {string}                         evt  The event
   * @param   {arg}                            arg  The argument, should be a query string
   *
   * @return  {MDFileDescriptor|undefined|string[]} Returns a MetaDescriptor, undefined, or an array
   */
  async run (evt: string, arg: string): Promise<MDFileDescriptor|undefined|FindFileAndReturnMetadataResult> {
    // The filename can contain a `#`, indicating a specified heading in the target file
    const filename = arg.includes('#') ? arg.slice(0, arg.indexOf('#')) : arg
    // Quick'n'dirty command to return the Meta descriptor for the given query
    const descriptor = this._app.workspaces.findExact(filename)
    if (descriptor === undefined) {
      return undefined
    }

    if (evt === 'find-exact') {
      return descriptor
    }

    const markdown = await this._app.fsal.loadAnySupportedFile(descriptor.path)
    const { content } = extractYamlFrontmatter(markdown)
    const lines = content.split('\n')

    let preview = ''
    let i = 0
    const maxPreviewLines = Math.min(lines.length, MAX_FILE_PREVIEW_LINES)
    while (preview.length <= MAX_FILE_PREVIEW_LENGTH && i < maxPreviewLines) {
      const remainingChars = MAX_FILE_PREVIEW_LENGTH - preview.length
      if (lines[i].length <= remainingChars) {
        preview += lines[i] + '\n'
      } else {
        preview += lines[i].slice(0, remainingChars) + '…'
      }
      i++
    }

    return {
      title: previewTitleGenerator(this._app.config.get().fileNameDisplay, descriptor),
      filePath: descriptor.path,
      previewMarkdown: preview,
      wordCount: descriptor.wordCount,
      modtime: descriptor.modtime
    }
  }
}
