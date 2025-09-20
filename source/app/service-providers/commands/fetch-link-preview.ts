/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        fetchLinkPreview command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command fetches a small preview for a link
 *
 * END HEADER
 */

import { fetchLinkPreview, type LinkPreviewResult } from '@common/util/fetch-link-preview'
import ZettlrCommand from './zettlr-command'
import path from 'path'
import extractYamlFrontmatter from '@common/util/extract-yaml-frontmatter'
import { nativeImage } from 'electron'
import type { AppServiceContainer } from 'source/app/app-service-container'

const MAX_FILE_PREVIEW_LENGTH = 300

export default class FetchLinkPreview extends ZettlrCommand {
  constructor (app: AppServiceContainer) {
    super(app, 'fetch-link-preview')
  }

  /**
   * Fetches a link preview for a given URL. Returns undefined if any error occurs.
   *
   * @param   {string}                                evt  The event
   * @param   {string}                                arg  The URL
   *
   * @return  {Promise<LinkPreviewResult|undefined>}       The result
   */
  async run (evt: string, arg: string): Promise<LinkPreviewResult|undefined> {
    const { editor } = this._app.config.getConfig()
    if (!editor.showLinkPreviews) {
      return undefined // No link previews wanted
    }

    // Catch a set of links that we can't fetch a preview for
    if (arg.startsWith('mailto:')) {
      return undefined
    }

    // Next, is it an absolute path to a file on the computer?
    if (arg.startsWith('safe-file://')) {
      arg = arg.slice(12)
      // Due to the colons in the drive letters on Windows, the pathname will
      // look like this: /C:/Users/Documents/test.jpg
      // See: https://github.com/Zettlr/Zettlr/issues/5489
      if (/^\/[A-Z]:/i.test(arg)) {
        arg = arg.slice(1)
      }
    }

    arg = decodeURIComponent(arg)

    if (path.isAbsolute(arg)) {
      try {
        const descriptor = await this._app.fsal.getDescriptorForAnySupportedFile(arg)
        const returnValue: LinkPreviewResult = {
          title: descriptor.name,
          summary: undefined,
          image: undefined
        }

        if (descriptor.type === 'code') {
          // For code files, preview the first ten lines
          const contents = await this._app.fsal.loadAnySupportedFile(arg)
          const lines = contents.split('\n')
          returnValue.summary = lines.slice(0, 10).join('\n')
        } else if (descriptor.type === 'file') {
          // For Markdown files, use either an existing abstract from the
          // frontmatter, or until we have either ten lines, or at most 200
          // characters.
          const rawContents = await this._app.fsal.loadAnySupportedFile(arg)
          const { frontmatter, content } = extractYamlFrontmatter(rawContents)

          if (frontmatter !== null && 'abstract' in frontmatter) {
            returnValue.summary = frontmatter.abstract
          } else {
            const lines = content.split('\n')
            returnValue.summary = ''
            let i = 0
            while (returnValue.summary.length <= MAX_FILE_PREVIEW_LENGTH && i < 10) {
              const remainingChars = MAX_FILE_PREVIEW_LENGTH - returnValue.summary.length
              if (lines[i].length <= remainingChars) {
                returnValue.summary += lines[i] + '\n'
              } else {
                returnValue.summary += lines[i].slice(0, remainingChars) + '…'
              }
              i++
            }
          }
        } else if (/\.(png|jpe?g)$/.test(descriptor.name)) {
          // Image file
          const img = nativeImage.createFromPath(descriptor.path)
          if (!img.isEmpty()) {
            const { width, height } = img.getSize()
            returnValue.summary = `${width}x${height}px`

            // Now resize so it's easier to load
            const small = height > width
              ? img.resize({ height: 100 })
              : img.resize({ width: 100 })

            returnValue.image = small.toDataURL()
          }
        } // Else: Unsupported file, leave it at the title

        return returnValue
      } catch (err: any) {
        return undefined
      }
    }

    try {
      return await fetchLinkPreview(arg)
    } catch (err: any) {
      this._app.log.verbose(`[Application] Could not fetch link preview for URL ${String(arg)}: ${String(err.message)}`)
      return undefined // Silently swallow errors
    }
  }
}
