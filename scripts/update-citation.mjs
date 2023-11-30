import got from 'got'
import YAML from 'yaml'
import { promises as fs } from 'fs'
import path from 'path'

const __dirname = process.platform === 'win32'
  ? path.dirname(decodeURI(import.meta.url.substring(8))) // file:///C:/...
  : path.dirname(decodeURI(import.meta.url.substring(7))) // file:///root/...

async function updateCitation () {
  // First, grab the "overall" DOI for the Zettlr repository. It will always
  // redirect to the last (most recent) record. The recordID thus is never the
  // same for subsequent versions, only the DOI remains static.
  console.log('Requesting https://doi.org/10.5281/zenodo.2580173 ...')
  let response = await got('https://doi.org/10.5281/zenodo.2580173')

  // response.url contains the final URL after all redirects, i.e. the
  // last part of that URL contains our record ID
  console.log(`Extracting recordID from final redirect URL "${response.url}" ...`)
  const pathParts = response.url.split('/')
  const recordID = pathParts[pathParts.length - 1]

  // Now that we have the recordID, we can grab the metadata
  // https://zenodo.org/api/records/5666029
  console.log('Requesting record data from the Zenodo REST API ...')
  response = await got(`https://zenodo.org/api/records/${recordID}`)

  console.log('Creating CITATION.cff file ...')
  const record = JSON.parse(response.body)
  // At this point we have all info that we need. Now build the citation file
  const fileContents = YAML.stringify({
    'cff-version': '1.2.0',
    message: record.metadata.notes,
    title: record.metadata.title,
    abstract: record.metadata.description,
    authors: [
      {
        'family-names': 'Erz',
        'given-names': 'Hendrik',
        orcid: 'https://orcid.org/0000-0003-0775-5919'
      }
    ],
    keywords: record.metadata.keywords,
    version: record.metadata.version,
    doi: '10.5281/zenodo.2580173',
    'date-released': record.created.substr(0, 10),
    license: record.metadata.license.id,
    'repository-code': 'https://github.com/Zettlr/Zettlr'
  })

  // Write to disk, and be done with it
  await fs.writeFile(path.resolve(__dirname, '../CITATION.cff'), fileContents, { encoding: 'utf-8' })
  console.log('File CITATION.cff written.')
}

updateCitation().catch(err => {
  console.error('Could not update Citations!')
  console.error(err)
  // Exit with a non-zero exit code so that the CI knows something went wrong
  process.exit(1)
})
