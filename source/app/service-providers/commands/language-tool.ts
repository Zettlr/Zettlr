/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        runLanguageTool command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command runs LanguageTool over a document
 *
 * END HEADER
 */

import ZettlrCommand from './zettlr-command'
import got, { HTTPError, RequestError } from 'got'
import { URLSearchParams } from 'url'
import { app } from 'electron'
import { trans } from '@common/i18n-main'
import type { AppServiceContainer } from 'source/app/app-service-container'
import { type LanguageToolIgnoredRuleEntry } from '../config/get-config-template'

export interface Annotation {
  text?: string,
  markup?: string,
  interpretAs?: string
}

export interface AnnotationData {
  annotation: Annotation[]
}

/**
 * This interface describes a single match reported by the LanguageTool API.
 */
export interface LanguageToolAPIMatch {
  /**
   * The long message (usually localized).
   */
  message: string
  /**
   * A short version of this message (usually localized). NOTE: May be an empty
   * string.
   */
  shortMessage: string
  /**
   * A list of possible replacements to fix this match.
   */
  replacements: Array<{ value: string }>
  /**
   * The offset in the character stream for this match.
   */
  offset: number
  /**
   * The length of this match (end point is offset + length).
   */
  length: number
  /**
   * Contextual information for this match.
   */
  context: {
    /**
     * An abridged version of the text surrounding this match.
     */
    text: string
    /**
     * The start offset of the context.
     */
    offset: number
    /**
     * The length of the context.
     */
    length: number
  }
  /**
   * The full sentence surrounding the match.
   */
  sentence: string
  /**
   * A bit of information on the type of match.
   */
  type: {
    /**
     * The typeName is something different from the issueType. I am not entirely
     * sure what it describes.
     */
    typeName: string
  }
  /**
   * General information about the rule that produced this match.
   */
  rule: {
    /**
     * A unique ID of this match, this can be used to ignore this rule for the
     * coming calls to the API.
     */
    id: string
    /**
     * This is a (usually localized) description of the rule.
     */
    description: string
    /**
     * This is the issue type of this rule (not the same as typeName).
     */
    issueType: string // misspelling, grammar, etc
    /**
     * The broader category of this rule.
     */
    category: {
      /**
       * The ID of the category
       */
      id: string
      /**
       * The (localized) name of the category.
       */
      name: string
    }
    /**
     * Whether the user is using premium.
     */
    isPremium: boolean
    /**
     * The confidence of LT that this match is a violation of this rule. Appears
     * to be bound between 0 and 1. Might be useful to filter out messages even
     * more based on how confident the API is.
     */
    confidence: number
    /**
     * An optional filename for where the rule is coming from. This does not
     * exist on all matches, which makes me suspect that this is only present
     * for rules defined in the `grammar.xml` file of the corresponding
     * language, but not for rules defined directly in the Java source.
     */
    sourceFile?: string
    /**
     * Appears to belong to the `sourceFile` argument; maybe it describes a
     * specific ID within the `grammar.xml` file.
     */
    subID?: string
    /**
     * A list of tags for this rule. I've seen it containing the string "picky",
     * which indicates that this can be used to identify whether a match has
     * been produced by the picky setting of the API.
     */
    tags?: string[]
  }
  /**
   * Appears to indicate if we should ignore this match in case we're dealing
   * with an incomplete sentence.
   */
  ignoreForIncompleteSentence: boolean
  /**
   * I am not entirely certain what this parameter does, but it appears to be 0
   * or -1.
   */
  contextForSureMatch: number
}

export interface LanguageToolAPIResponse {
  software: {
    name: string
    version: string
    buildDate: string
    apiVersion: number
    premium: boolean
    premiumHint?: string
    status: string
  }
  warnings: {
    incompleteResults: boolean
  }
  language: {
    name: string // Readable (English)
    code: string // bcp-47
    detectedLanguage: {
      name: string
      code: string
      confidence: number
      source: string
    }
  }
  matches: LanguageToolAPIMatch[]
  sentenceRanges: Array<[ number, number ]>
}

const supportedLanguages: Record<string, string[]> = {}

/**
 * Returns a list of all language codes that the given server supports. Returns
 * this list either from cache, or fetch the list from the server.
 *
 * @param   {string}             server  The server to query
 *
 * @return  {Promise<string>[]}          A list of supported languages
 */
async function fetchSupportedLanguages (server: string): Promise<string[]> {
  if (server in supportedLanguages) {
    return supportedLanguages[server]
  }

  // Otherwise, fetch the languages from the server
  const result = await got(`${server}/v2/languages`)
  const languages: Array<{ name: string, code: string, longCode: string }> = JSON.parse(result.body)
  const shortCodes = languages.map(l => l.code)
  const longCodes = languages.map(l => l.longCode)

  const allLanguages = [...new Set([ ...shortCodes, ...longCodes ])]
  supportedLanguages[server] = allLanguages
  return allLanguages
}

export type LanguageToolLinterRequest = { data: AnnotationData, language: string }
export type LanguageToolLinterResponse = [LanguageToolAPIResponse, supportedLanguages: string[]]|string|undefined

export default class LanguageTool extends ZettlrCommand {
  constructor (app: AppServiceContainer) {
    super(app, [ 'run-language-tool', 'add-language-tool-ignore-rule' ])
  }

  /**
   * Fetches LanguageTool replies for a given text. It returns either an API
   * response, if everything went well, a string if there was a (possibly
   * fixable) error (such as using the official LanguageTool API and sending a
   * document with more than 20k or 80k characters), and undefined if something
   * to-be-expected happened (such as: the service is not even turned on in the
   * settings).
   *
   * @param   {'add-language-tool-ignore-rule'|'run-language-tool'}     evt  The event
   * @param   {LanguageToolLinterRequest|LanguageToolIgnoredRuleEntry}  arg  The text to check
   *
   * @return  {Promise<LanguageToolLinterResponse|boolean>}                  The result
   */
  async run (evt: 'add-language-tool-ignore-rule', arg: LanguageToolIgnoredRuleEntry): Promise<boolean>
  async run (evt: 'run-language-tool', arg: LanguageToolLinterRequest): Promise<LanguageToolLinterResponse>
  async run (evt: 'add-language-tool-ignore-rule'|'run-language-tool', arg: LanguageToolLinterRequest|LanguageToolIgnoredRuleEntry): Promise<LanguageToolLinterResponse|boolean> {
    // Check if we only should add a rule to our ignore list
    if (evt === 'add-language-tool-ignore-rule' && 'id' in arg) {
      return this.addIgnoreRule(arg)
    } else if (!('data' in arg)) {
      throw new Error('Wrong call signature for language tool command. Either you called add-ignore-rule with a LanguageTool lint request, or run-language-tool with an ignore rule.')
    }

    const {
      active,
      level,
      motherTongue,
      variants,
      username,
      apiKey,
      customServer,
      provider,
      ignoredRules
    } = this._app.config.getConfig().editor.lint.languageTool
    const { data, language } = arg

    if (!active) {
      return undefined // LanguageTool is not active
    }

    const disabledRules = ignoredRules.map(r => r.id).join(',')
    const searchParams = new URLSearchParams({ language, data: JSON.stringify(data), level, disabledRules })

    // If the user has set the mother tongue, add it to the params
    if (motherTongue.trim() !== '') {
      searchParams.append('motherTongue', motherTongue)
    }

    // If the language is auto-detected, add the preferred variants from the
    // settings
    if (language === 'auto') {
      searchParams.append('preferredVariants', Object.values(variants).join(','))
    }

    const useCredentials = username.trim() !== '' && apiKey.trim() !== ''

    let server = 'https://api.languagetool.org'
    if (provider === 'custom' && customServer.trim() !== '') {
      // The user has provided a custom server
      server = customServer.trim()
    }

    // If users have Premium, they can do so by providing their username and API
    // key. NOTE: In that case, we must use the premium API at
    // languagetoolplus.com, since both custom servers and the basic API are not
    // equipped to handle authentication.
    if (useCredentials) {
      searchParams.set('username', username.trim())
      searchParams.set('apiKey', apiKey.trim())
      server = 'https://api.languagetoolplus.com'
    }

    if (server.endsWith('/')) {
      server = server.substring(0, server.length - 1)
    }

    const numCharacters = data.annotation.reduce((a, b) => a + (b.text?.length ?? b.markup?.length ?? 0), 0)

    const headers = {
      // NOTE: For debugging purposes, we send a custom User-Agent string. This
      // should help figure out potential problems in case Zettlr causes large
      // request flows to the official servers
      'User-Agent': `Zettlr/${app.getVersion()} (${process.platform}-${process.arch})`
    }

    try {
      this._app.log.verbose(`[Application] Contacting LanguageTool at ${server} (using credentials: ${String(useCredentials)}); payload: ${numCharacters} characters`)
      const languages = await fetchSupportedLanguages(server)
      // NOTE: Documentation at https://languagetool.org/http-api/#!/default/post_check
      const result = await got(`${server}/v2/check`, { method: 'post', body: searchParams.toString(), headers })
      return [ JSON.parse(result.body), languages ]
    } catch (err: any) {
      // Always report errors
      this._app.log.error(`[Application] Error running LanguageTool: ${String(err.message)}`, err)
      if (err instanceof HTTPError && err.code === 'ERR_NON_2XX_3XX_RESPONSE') {
        // The API complained. There are a few things that can happen, and here
        // we only translate them into error messages the users can understand.
        switch (err.message) {
          case 'Response code 413 (Request Entity Too Large)':
            return trans('Document too long')
          default:
            return err.message // This allows us to detect other error messages we need to translate
        }
      } else if (err instanceof RequestError) {
        return trans('offline') // Maybe very coarse, but remember it needs to be concise and user-readable
      }

      return undefined // Silently swallow errors
    }
  }

  addIgnoreRule (rule: LanguageToolIgnoredRuleEntry): boolean {
    const allRules = this._app.config.get().editor.lint.languageTool.ignoredRules

    const existingRule = allRules.find(r => r.id === rule.id)
    if (existingRule !== undefined) {
      return false // Don't re-add twice
    }

    allRules.push(rule)
    this._app.config.set('editor.lint.languageTool.ignoredRules', JSON.parse(JSON.stringify(allRules)))
    return true
  }
}
