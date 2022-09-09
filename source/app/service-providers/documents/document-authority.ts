// The document authority is a module that serves as the ground truth for all
// document states. All editors simply provide a "view" on the document, the
// actual saving and management will be done here in the authority. We use
// Codemirror's `collab` module to do so. It's not a collaboration between many
// people as intended, but basically a collaboration between many *editors* on
// the same machine.
import { ChangeSet, Text } from '@codemirror/state'
import { Update } from '@codemirror/collab'
import { DocumentType } from '@dts/common/documents'

const MAX_VERSION_HISTORY = 100 // Keep no more than this many updates.

interface Document {
  filePath: string
  type: DocumentType
  pendingPulls: Array<(updates: Update[]) => void>
  currentVersion: number
  minimumVersion: number
  updates: Update[]
  document: Text
  lastSavedVersion: number // Allows to quickly check if the doc has been modified: currentVersion > lastSavedVersion
}

export class DocumentAuthority {
  private readonly documents: Document[]

  constructor () {
    this.documents = []
  }

  public async pullUpdates (filePath: string, clientVersion: number): Promise<Update[]|false> {
    const doc = this.documents.find(doc => doc.filePath === filePath)
    if (doc === undefined) {
      throw new Error(`Could not send updates for file ${filePath}: Not found.`)
    }

    if (clientVersion < doc.minimumVersion) {
      // TODO: This means that the client is completely out of sync and needs to
      // re-fetch the whole document.
      return false
    } else if (clientVersion < doc.currentVersion) {
      console.warn(`Pulling updates for ${filePath}. ClientVersion is ${clientVersion}; current: ${doc.currentVersion}`)
      return doc.updates.slice(clientVersion)
    } else {
      // What this weird little construction will do is return a Promise that
      // will eventually resolve with updates, after some client has pushed
      // updates to the corresponding document.
      return await new Promise<Update[]>((resolve, reject) => {
        doc.pendingPulls.push((updates: Update[]) => {
          resolve(updates)
        })
      })
    }
  }

  public async pushUpdates (filePath: string, clientVersion: number, clientUpdates: any[]): Promise<boolean> { // clientUpdates must be produced via "toJSON"
    const doc = this.documents.find(doc => doc.filePath === filePath)
    if (doc === undefined) {
      throw new Error(`Could not receive updates for file ${filePath}: Not found.`)
    }

    if (clientVersion !== doc.currentVersion) {
      console.log('Client wanted to push updates, but it has a wrong version!')
      return false
    }

    for (const update of clientUpdates) {
      const changes = ChangeSet.fromJSON(update.changes)
      doc.updates.push({ changes, clientID: update.clientID })
      doc.document = changes.apply(doc.document)
      doc.currentVersion = doc.minimumVersion + doc.updates.length
      // People are lazy, and hence there is a non-zero chance that in a few
      // instances the currentVersion will get dangerously close to
      // Number.MAX_SAFE_INTEGER. In that case, we need to perform a rollback to
      // version 0 and notify all editors that have the document in question
      // open to simply re-load it. That will cause a screen-flicker, but
      // honestly better like this than otherwise.
      if (doc.currentVersion === Number.MAX_SAFE_INTEGER - 1) {
        console.warn(`Document ${filePath} has reached MAX_SAFE_INTEGER. Performing rollback ...`)
        doc.minimumVersion = 0
        doc.currentVersion = doc.updates.length
        // TODO: Broadcast a message so that all editor instances can reload the
        // document.
      }
    }

    // Notify all clients that have in the meantime requested new updates
    for (const cb of doc.pendingPulls) {
      cb(clientUpdates)
    }
    doc.pendingPulls = []

    // Drop all updates that exceed the amount of updates we allow.
    while (doc.updates.length > MAX_VERSION_HISTORY) {
      doc.updates.shift()
      doc.minimumVersion++
    }

    return true
  }

  public async getDocument (filePath: string): Promise<{ content: string; type: DocumentType; startVersion: number; }> {
    const existingDocument = this.documents.find(doc => doc.filePath === filePath)
    if (existingDocument !== undefined) {
      return {
        content: existingDocument.document.toString(),
        type: existingDocument.type,
        startVersion: existingDocument.currentVersion
      }
    }

    // TODO: Replace the following with a proper file loader
    let content = ''
    let type = DocumentType.Markdown

    if (filePath.includes('doc1')) {
      content = doc4 // doc1
      type = DocumentType.Markdown
    } else if (filePath.includes('doc2')) {
      content = doc2
      type = DocumentType.YAML
    } else {
      content = doc3
      type = DocumentType.Markdown
    }

    const doc: Document = {
      filePath,
      type,
      currentVersion: 0,
      minimumVersion: 0,
      updates: [],
      pendingPulls: [],
      document: Text.of(content.split('\n')),
      lastSavedVersion: 0
    }

    this.documents.push(doc)

    return { content, type, startVersion: 0 }
  }

  public async save (filePath: string): Promise<void> {
    // TODO: Properly save a file here
    const doc = this.documents.find(doc => doc.filePath === filePath)

    if (doc === undefined) {
      throw new Error(`Could not save document ${filePath}: Not found`)
    }

    console.log(`"Saving" document ${filePath}. New version is ${doc.currentVersion}`)

    doc.lastSavedVersion = doc.currentVersion
  }

  // Returns an array for each document, indicating whether the document is modified
  public getModificationStatus (): Array<{ filePath: string, modified: boolean }> {
    return this.documents.map(doc => {
      return {
        filePath: doc.filePath,
        modified: doc.currentVersion !== doc.lastSavedVersion
      }
    })
  }
}
