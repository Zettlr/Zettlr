import { CSLBibTex } from 'citeproc'

export interface IpcCiteService {
    /*
    * Test
    */
    getStatus(): number
    
    /**
   * Takes IDs as set in Zotero and returns Author-Date citations for them.
   * @param  keys A list of IDs to be returned
   * @return The rendered string
   */
    getCitation(keys: Array<string>|string): string

    /**
   * Updates the items that the engine uses for bibliographies. Must be called
   * prior to makeBibliography()
   * @param keys A list of IDs
   * @return An indicator whether or not the call succeeded and the registry has been updated.
   */
    updateItems(keys: Array<string>): boolean

    /**
   * Directs the engine to create a bibliography from the items currently in the
   * registry (this can be updated by calling updateItems with an array of IDs.)
   * @return A CSL object containing the bibliography.
   */
    makeBibliography(): CSLBibTex
}