/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DatabaseLoader
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Contains the logic for loading Citation databases.
 *
 * END HEADER
 */

import type { DatabaseRecord } from '..'
import extractBibTexAttachments from './extract-bibtex-attachments'
import { parse as parseBibTex } from 'astrocite-bibtex'
import { BibLatexParser, CSLExporter } from 'biblatex-csl-converter'
import YAML from 'yaml'
import { promises as fs } from 'fs'
import path from 'path'
import type LogProvider from '../../log'

/**
 * Load the provided database into a DatabaseRecord.
 *
 * @param   {string}                   databasePath  The database path
 *
 * @return  {Promise<DatabaseRecord>}                The DatabaseRecord.
 */
export async function loadDatabase (databasePath: string, logger: LogProvider): Promise<DatabaseRecord> {
  const filenameExtension = path.extname(databasePath).toLowerCase()
  switch (filenameExtension) {
    case '.json':
      logger.info(`Loading database ${path.basename(databasePath)} as CSL JSON.`)
      return await loadJSON(databasePath, logger)
    case '.yml':
    case '.yaml':
      logger.info(`Loading database ${path.basename(databasePath)} as CSL YAML.`)
      return await loadYAML(databasePath, logger)
    case '.bib':
      // NOTE: ASSUMPTION: Since BibTeX and BibLaTeX share the same file
      // endings, we first attempt to load it as BibLaTeX and if it throws we
      // fall back to BibTeX.
      try {
        logger.info(`Loading database ${path.basename(databasePath)} as BibLaTeX.`)
        return await loadBibLaTeX(databasePath, logger)
      } catch (err) {
        logger.info(`Loading database ${path.basename(databasePath)} as BibLaTeX failed. Falling back to loading as BibTeX.`)
        return await loadBibTeX(databasePath, logger)
      }
    default:
      throw new Error(`Could not load database ${databasePath}: Unknown extension`)
  }
}

/**
 * Loads a JSON database.
 *
 * @param   {string}                   databasePath  The database path
 *
 * @return  {Promise<DatabaseRecord>}                The record
 */
async function loadJSON (databasePath: string, logger: LogProvider): Promise<DatabaseRecord> {
  const record: DatabaseRecord = {
    path: databasePath,
    type: 'csl',
    cslData: {},
    bibtexAttachments: Object.create(null)
  }

  const data = await fs.readFile(databasePath, 'utf8')

  const parsedData = JSON.parse(data)

  if (!Array.isArray(parsedData)) {
    throw new Error(`Cannot parse CSL JSON database ${databasePath}: JSON was not an array.`)
  }

  // NOTE February 19, 2026: After receiving reports of users not being able to
  // get citekeys to autocomplete, I found out by looking at a problematic CSL
  // JSON file that due to the 8.0.3 update of Zotero, one item was missing its
  // citekey. For the past almost decade, Zettlr could assume that the CSL JSON
  // produced by Zotero was sane, because we always cast the parsed JSON data as
  // citekey and be done with it. To improve app stability, we're going to treat
  // each item as unknown before loading it now. This also guards against future
  // issues.
  // NOTE for the tinfoil hatters among you: I am strongly convinced that this
  // is a mere aleatoric event that could've happened eight years ago, but
  // didn't. It's in my opinion not a sign of software rot (unless it becomes
  // part of a pattern), but just a silly coincidence. No references were harmed
  // in producing this fix.
  for (const item of parsedData as unknown[]) {
    if (!(item instanceof Object)) {
      logger.error('[Citeproc] Refusing to load CSL item: Not an object.', item)
      continue
    }

    if (!('id' in item) || !('type' in item) || (typeof item.id !== 'string') || (typeof item.type !== 'string')) {
      logger.error('[Citeproc] Refusing to load CSL item: Required properties id or type were either not present, or the wrong type.', item)
      continue
    }

    record.cslData[item.id] = item as CSLItem
  }

  logger.info(`CSL JSON database loaded, ${Object.keys(record.cslData).length} items.`)

  return record
}

/**
 * Loads a YAML database file.
 *
 * @param   {string}                   databasePath  The database
 *
 * @return  {Promise<DatabaseRecord>}                The record
 */
async function loadYAML (databasePath: string, logger: LogProvider): Promise<DatabaseRecord> {
  const record: DatabaseRecord = {
    path: databasePath,
    type: 'csl',
    cslData: {},
    bibtexAttachments: Object.create(null)
  }

  // First read in the database file
  const data = await fs.readFile(databasePath, 'utf8')

  let yamlData = YAML.parse(data)
  if ('references' in yamlData) {
    yamlData = yamlData.references // CSL YAML is stored in `references`
  } else if (!Array.isArray(yamlData)) {
    throw new Error('The CSL YAML file did not contain valid contents.')
  }

  for (const item of yamlData) {
    record.cslData[item.id] = item
  }

  logger.info(`CSL JSON database loaded, ${Object.keys(record.cslData).length} items.`)

  return record
}

/**
 * Loads a BibTeX database
 *
 * @param   {string}                   databasePath  The database file
 *
 * @return  {Promise<DatabaseRecord>}                The record
 */
async function loadBibTeX (databasePath: string, logger: LogProvider): Promise<DatabaseRecord> {
  const record: DatabaseRecord = {
    path: databasePath,
    type: 'bibtex',
    cslData: {},
    bibtexAttachments: Object.create(null)
  }

  // First read in the database file
  const data = await fs.readFile(databasePath, 'utf8')

  for (const item of parseBibTex(data)) {
    record.cslData[item.id] = item
  }

  // If we're here, we had a BibTex library --> extract the attachments
  const attachments = extractBibTexAttachments(data, path.dirname(databasePath))
  record.bibtexAttachments = attachments

  logger.info(`BibTeX database loaded, ${Object.keys(record.cslData).length} items; ${record.bibtexAttachments.length} attachments found.`)

  return record
}

/**
 * Loads a BibLaTeX database
 *
 * @param   {string}                   databasePath  The database file
 *
 * @return  {Promise<DatabaseRecord>}                The record
 */
async function loadBibLaTeX (databasePath: string, logger: LogProvider): Promise<DatabaseRecord> {
  const record: DatabaseRecord = {
    path: databasePath,
    type: 'biblatex',
    cslData: {},
    bibtexAttachments: Object.create(null)
  }

  const data = await fs.readFile(databasePath, 'utf8')

  const parser = new BibLatexParser(data, { processUnexpected: true, processUnknown: true })
  const bib = await parser.parseAsync()

  const cslExporter = new CSLExporter(bib.entries, false, {
    useEntryKeys: true
  })

  const cslOutput = cslExporter.parse()
  for (const [ key, item ] of Object.entries(cslOutput)) {
    // NOTE: This is a type difference between CSLEntry and CSLItem, but the
    // library does assign the type property currently (I checked the source).
    record.cslData[key] = item as CSLItem
  }

  // Now we also have to extract file fields (if they have been exported). The
  // BibLaTeX parser counts it as an unexpected field, accessible from
  // bib.entries[idx].unexpected_fields.file
  for (const [ key, item ] of Object.entries(bib.entries)) {
    if (!('unexpected_fields' in item)) {
      record.bibtexAttachments[key] = false
      continue
    }

    if (typeof item.unexpected_fields?.file !== 'string') {
      record.bibtexAttachments[key] = false
      continue
    }

    record.bibtexAttachments[key] = [item.unexpected_fields.file]
  }

  logger.info(`BibLaTeX database loaded, ${Object.keys(record.cslData).length} items.`)
  
  // NOTE: The bib parser will encounter strange data and define them as errors.
  // HOWEVER this does NOT mean that the entries are invalid; just that some
  // input data is not as expected. We log them here.
  if (bib.errors.length > 0) {
    for (const error of bib.errors) {
      logger.error(`BibLaTeX Parsing error on line ${error.line} (entry: ${error.entry}): ${error.type} (${error.value})`)
    }
  }

  return record
}
