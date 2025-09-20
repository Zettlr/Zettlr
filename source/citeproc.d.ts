/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Citeproc Typings
 * CVM-Role:        Types
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Contains the types for Citeproc.js, since these are not (yet)
 *                  added to the types repository.
 *
 * END HEADER
 */

/**
 * Encoding citation data items in properly formatted CSL-JSON is essential to
 * getting correct results from the CSL Processor. Each citation item is
 * composed of fields of various types. Multiple citation items can be packaged
 * into a container, which allows related citations to be treated as a unit of
 * citations.
 */
interface CSLItem {
  /**
   * The citation key, for instance as managed by Zotero.
   */
  id: string
  /**
   * The publication type as described by the CSL specification
   */
  type: string
  /**
   * Arbitrary values can be passed here as well
   */
  [key?: string]: any
}

/**
 * A minimal citation data object, used as input by both the
 * processCitationCluster() and appendCitationCluster() command, has the
 * following form.
 */
interface EngineCitation {
  citationItems: CiteItem[]
  properties: {
    /**
     * The noteIndex value indicates the footnote number in which the citation
     * is located within the document. Essentially, this is a one-based (!)
     * array index for use in `processCitationCluster()`.
     */
    noteIndex: number
  }
  /**
   * A unique ID assigned to the citation, for internal use by the processor.
   * This ID may be assigned by the calling application, but it must uniquely
   * identify the citation, and it must not be changed during processing or
   * during an editing session.
   */
  citationID?: string
}

/**
 * Cite-items describe a specific reference to a bibliographic item. The fields
 * that a cite-item may contain depend on its context. In a citation, cite-items
 * listed as part of the citationItems array provide only pinpoint, descriptive,
 * and text-suppression fields.
 */
interface CiteItem {
  /**
   * The only required field: Contains a citation key with which the engine can
   * request the full bibliographic information from the registry.
   */
  id: string
  /**
   * A string identifying a page number or other pinpoint location or range
   * within the resource.
   */
  locator?: string
  /**
   * A label type, indicating whether the locator is to a page, a chapter, or
   * other subdivision of the target resource. Valid labels are defined in the
   * CSL specification.
   */
  label?: string
  /**
   * If true, author names will not be included in the citation output for this
   * cite.
   */
  'suppress-author'?: boolean
  /**
   * If true, only the author name will be included in the citation output for
   * this cite – this optional parameter provides a means for certain demanding
   * styles that require the processor output to be divided between the main
   * text and a footnote. (See the section Partial suppression of citation
   * content under Running the Processor :: Dirty Tricks for more details.)
   */
  'author-only'?: boolean
  /**
   * A string to print before this cite item.
   */
  prefix?: string
  /**
   * A string to print after this cite item.
   */
  suffix?: string
}

/**
 * Development options that can be set after initializing the Engine. Use with
 * caution!
 */
interface CSLEngineDevelopmentExtensions {
  /**
   * The CSL variables needed to render a particular citation may not be
   * available directly in the data structures of a calling application. For
   * those situations, the processor can recognize supplementary values entered
   * into the note field of a CSL item. The facility is available when the
   * processor is run with the field_hack option (default is true)
   */
  field_hack: boolean
  allow_field_hack_date_override: boolean
  locator_date_and_revision: boolean
  locator_label_parse: boolean
  raw_date_parsing: boolean
  clean_up_csl_flaws: boolean
  consolidate_legal_items: boolean
  csl_reverse_lookup_support: boolean
  /**
   * When set to true, the engine will wrap links and DOIs in HTML anchors.
   * The default is false.
   */
  wrap_url_and_doi: boolean
  thin_non_breaking_space_html_hack: boolean
  apply_citation_wrapper: boolean
  main_title_from_short_title: boolean
  uppercase_subtitles: boolean
  normalize_lang_keys_to_lowercase: boolean
  strict_text_case_locales: boolean
  expect_and_symbol_form: boolean
  require_explicit_legal_case_title_short: boolean
  spoof_institutional_affiliations: boolean
  force_jurisdiction: boolean
  parse_names: boolean
  hanging_indent_legacy_number: boolean
  throw_on_empty: boolean
  strict_inputs: boolean
  prioritize_disambiguate_condition: boolean
  force_short_title_casing_alignment: boolean
  implicit_short_title: boolean
  force_title_abbrev_fallback: boolean
  split_container_title: boolean
  legacy_institution_name_ordering: boolean
  etal_min_etal_usefirst_hack: boolean
}

/**
 * Options set on the CSL engine
 */
interface CSLEngineOptions {
  parallel: boolean
  has_disambiguate: boolean
  mode: string
  sort_citations: boolean
  development_extensions: CSLEngineDevelopmentExtensions
}

interface BibliographyOptions {
  /**
   * Some citation styles apply a label (either a number or an alphanumeric
   * code) to each bibliography entry, and use this label to cite bibliography
   * items in the main text. In the bibliography, the labels may either be hung
   * in the margin, or they may be set flush to the margin, with the citations
   * indented by a uniform amount to the right. In the latter case, the amount
   * of indentation needed depends on the maximum width of any label. The
   * maxoffset value gives the maximum number of characters that appear in any
   * label used in the bibliography. The client that controls the final
   * rendering of the bibliography string should use this value to calculate
   * and apply a suitable indentation length.
   */
  maxoffset: number
  /**
   * An integer representing the spacing between entries in the bibliography.
   */
  entryspacing: number
  /**
   * An integer representing the spacing between the lines within each
   * bibliography entry.
   */
  linespacing: number
  /**
   * A boolean value indicating whether hanging indent should be applied.
   */
  hangingindent: boolean
  /**
   * When the second-field-align CSL option is set, this returns either “flush”
   * or “margin”. The calling application should align text in bibliography
   * output as described in the CSL specification. Where second-field-align is
   * not set, this return value is set to false.
   */
  'second-field-align': 'flush'|'margin'|false
  /**
   * A string to be appended to the front of the finished bibliography string.
   */
  bibstart: string
  /**
   * A string to be appended to the end of the finished bibliography string.
   */
  bibend: string
}

/**
 * CSL kernel configuration on initialisation of the engine
 */
interface CSLKernelConfig {
  /**
   * The retrieveLocale() function fetches CSL locales needed at runtime. The
   * locale source is available for download from the CSL locales repository.
   * The function takes a single RFC 5646 language tag as its sole argument,
   * and returns a locale object. The return may be a serialized XML string, an
   * E4X object, a DOM document, or a JSON or JavaScript representation of the
   * locale XML. If the requested locale is not available, the function must
   * return a value that tests false. The function must return a value for the
   * us locale.
   *
   * @param   {string}                           language  RFC 5646 language tag
   *
   * @return  {string|Object|Element|JSON|false}           The return value
   */
  retrieveLocale: (language: string) => string|Record<string, unknown>|Element|JSON|false
  /**
   * The retrieveItem() function fetches citation data for an item. The
   * function takes an item ID as its sole argument, and returns a JavaScript
   * object in CSL JSON format.
   *
   * @param   {string}  itemID  The item ID (citation key)
   *
   * @return  {CSLItem}         The resolved CSL Item
   */
  retrieveItem: (itemID: string) => CSLItem
  stringCompare?: any // TODO
}

/**
 * The actual intantiated CSL kernel configuration
 */
type CSLKernel = CSLKernelConfig

/**
 * The result of processCitationCluster()
 */
type ProcessCitationClusterResult = [
  /**
   * Metadata produced by the processing.
   */
  metadata: {
    bibchange: boolean,
    citation_errors: any[]
  },
  /**
   * Changed item based on the processing.
   */
  changedItems: Array<[
    /**
     * This is the zero-based index of the citation in the document based on the
     * pre- and post-citations. If multiple items have changed (e.g., due to
     * disambiguation), these indices can be used to accurately find those
     * again.
     */
    index: number,
    /**
     * The rendered citation according to the CSL style
     */
    renderedCitation: string,
    /**
     * The ID assigned by the engine to this citation. This differs from the
     * citation IDs because a single citation cluster may have several IDs. The
     * engine will pre-sort and preprocess them, and then assign each
     * combination of cite items an individual ID.
     */
    registryID: string
  ]>
]

declare module 'citeproc' {
  export class Engine {
    public processor_version: string
    public csl_version: string
    public sys: CSLKernel
    public opt: CSLEngineOptions
    /**
     * Initialise the processor
     *
     * @param   {CSLKernelConfig}  sys        The kernel to be used to retrieve items
     * @param   {string}           style      The CSL Style to be used
     * @param   {string}           lang       The language, bcp-47 compatible
     * @param   {boolean}          forceLang  Whether to force the usage of "lang", overriding "default-locale" of the CSL style
     *
     * @return  {CSLEngine}                   The initiated engine
     */
    constructor (sys: CSLKernelConfig, style, lang?: string, forceLang?: boolean): Engine
    /**
     * The updateItems() method accepts a single argument when invoked as a
     * public method, and refreshes the registry with a designated set of
     * citable items. Citable items not listed in the argument are removed from
     * the registry:
     *
     * @param   {string[]}  idList  A list of citation IDs to be citable.
     */
    updateItems (idList: string[]): void
    /**
     * Like its corollary above, the updateUncitedItems() method the registry
     * accepts a single argument, but refreshes the registry with a designated
     * set of uncited items. Uncited items not listed in the argument are
     * removed from the registry.
     *
     * @param   {string[]}  idList  A list of citation IDs to be marked as uncited
     */
    updateUncitedItems (idList: string[]): void
    /**
     * Use the processCitationCluster() method to generate and maintain
     * citations dynamically in the text of a document.
     *
     * @param   {EngineCitation}        citation       The actual citation to generate
     * @param   {[ string, number ][]}  citationsPre   A list of citations cited prior to the citation
     * @param   {[ string, number ][]}  citationsPost  A list of citations cited after the citation
     *
     * @return  {any}                                  An array of two elements: a data object, and an array of one or more index/string pairs, one for each citation affected by the citation edit or insertion operation.
     */
    processCitationCluster (citation: EngineCitation, citationsPre: [ string, number ][], citationsPost: [ string, number ][]): ProcessCitationClusterResult
    /**
     * Use previewCitationCluster() to generate accurately formatted citations
     * as they would appear at a given location within a document managed using
     * processCitationCluster(). The method accepts four arguments, the first
     * three of which are identical to those accepted by
     * processCitationCluster(). The fourth argument may be used to control the
     * output mode.
     *
     * @param   {EngineCitation}        citation       The actual citation to generate
     * @param   {[ string, number ][]}  citationsPre   A list of citations cited prior to the citation
     * @param   {[ string, number ][]}  citationsPost  A list of citations cited after the citation
     * @param   {html|text|rtf}         format         Either HTML, TXT, or RTF, indicating the output format
     *
     * @return  {string}                               The rendered citation
     */
    previewCitationCluster (citation: EngineCitation, citationsPre: [ string, number ][], citationsPost: [ string, number ][], format?: 'html'|'text'|'rtf'): string
    /**
     * Use makeCitationCluster() to generate citations without the burden of
     * registry adjustments. The method accepts an array of cite-items as its
     * sole argument. While makeCitationCluster() is faster than its companions,
     * note that it does not perform the citation sort, if any, that might be
     * required by the style, and that it does not perform disambiguation or
     * apply style rules to adjust the cites as appropriate to the context.
     * This method is primarily useful for writing simplified test fixtures. It
     * should not be relied on in production.
     *
     * @param   {CiteItem[]}  idList  A list of Citations
     *
     * @return  {string}            The rendered citation
     */
    makeCitationCluster (idList: CiteItem[]): string
    /**
     * The makeBibliography() method returns a single bibliography object based
     * on the current state of the processor registry. It accepts on optional
     * argument.
     *
     * @param   {any}                filter  Undocumented option
     *
     * @return  {[BibliographyOptions, string[]]}          The output is a two-index array
     */
    makeBibliography (filter?: any): [BibliographyOptions, string[]]
  }
}
