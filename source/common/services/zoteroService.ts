// File: source/common/services/zoteroService.ts

import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import fetch from 'node-fetch'

export interface CitationItem {
  citekey: string
  title:   string
  author:  string
  year:    string
}

export class ZoteroService {
  // switch to the CAYW URL:
  private caywUrl = 'http://127.0.0.1:23119/better-bibtex/cayw?format=json'

  /** pop up the Zotero picker and get back an array of CSL items */
  async searchCitations(_: string): Promise<CitationItem[]> {
    try {
      const res = await fetch(this.caywUrl)
      if (!res.ok) throw new Error(`CAYW HTTP ${res.status}`)
      const items = (await res.json()) as Array<{
        citationKey: string
        title:       string
        item: {
          creators: Array<{ firstName?: string; lastName: string }>
          date?: string
        }
      }>

      return items.map(i => ({
        citekey: i.citationKey,
        title:   i.title,
        author:  i.item.creators
                     .map(c => [c.firstName, c.lastName].filter(Boolean).join(' '))
                     .join(', '),
        year:    i.item.date?.slice(0,4) ?? ''
      }))
    }
    catch (err) {
      console.error('Zotero CAYW failed:', err)
      return []
    }
  }

  /** expose it on the same channel your renderer is already invoking */
  registerIpc() {
    ipcMain.handle(
      'zotero:search',
      (_: IpcMainInvokeEvent, q: string) => this.searchCitations(q)
    )
  }
}
