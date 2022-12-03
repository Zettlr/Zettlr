<template>
  <div role="tabpanel">
    <!-- References -->
    <h1>{{ referencesLabel }}</h1>
    <!-- Will contain the actual HTML -->
    <div v-html="referenceHTML"></div>
  </div>
</template>

<script lang="ts">
import { trans } from '@common/i18n-renderer'
import extractCitations from '@common/util/extract-citations'
import getBibliographyForDescriptor from '@common/util/get-bibliography-for-descriptor'
import { DP_EVENTS, OpenDocument } from '@dts/common/documents'
import { AnyDescriptor } from '@dts/common/fsal'
import { defineComponent } from 'vue'

const ipcRenderer = window.ipc

export default defineComponent({
  name: 'ReferencesTab',
  data () {
    return {
      bibliography: undefined as [{ bibstart: string, bibend: string }, string[]]|undefined
    }
  },
  computed: {
    referencesLabel: function (): string {
      return trans('References')
    },
    activeFile: function (): OpenDocument|null {
      return this.$store.getters.lastLeafActiveFile()
    },
    /**
     * Takes the bibliography and returns a renderable HTML representation of it
     *
     * @return  {string}  The HTML contents as a string
     */
    referenceHTML: function (): string {
      if (this.bibliography === undefined || this.bibliography[1].length === 0) {
        return `<p>${trans('There are no citations in this document.')}</p>`
      }

      const html = [this.bibliography[0].bibstart]

      for (const entry of this.bibliography[1]) {
        html.push(entry)
      }

      html.push(this.bibliography[0].bibend)

      return html.join('\n')
    }
  },
  watch: {
    activeFile () {
      this.updateBibliography().catch(e => console.error('Could not update bibliography', e))
    }
  },
  mounted () {
    ipcRenderer.on('documents-update', (e, { event, context }) => {
      // Update the bibliography if the active file has been saved
      if (event === DP_EVENTS.CHANGE_FILE_STATUS && context.status === 'modification') {
        const { filePath } = context

        if (filePath === this.activeFile?.path) {
          this.updateBibliography().catch(e => console.error('Could not update bibliography', e))
        }
      }
    })

    // Initial bibliography update
    this.updateBibliography().catch(e => console.error('Could not update bibliography', e))
  },
  methods: {
    /**
     * Updates the bibliography displayed in the sidebar based on the current
     * active file.
     */
    async updateBibliography () {
      if (this.activeFile === null) {
        this.bibliography = undefined
        return
      }

      const descriptor: AnyDescriptor|undefined = await ipcRenderer.invoke('application', {
        command: 'get-descriptor',
        payload: this.activeFile.path
      })

      if (descriptor === undefined || descriptor.type !== 'file') {
        this.bibliography = undefined
        return
      }

      const fileContents: string = await ipcRenderer.invoke('application', {
        command: 'get-file-contents',
        payload: this.activeFile.path
      })

      const library = getBibliographyForDescriptor(descriptor)
      const citations = extractCitations(fileContents)
      const keys = []
      for (const citation of citations) {
        keys.push(...citation.citations.map(elem => elem.id))
      }

      // Now also include potential nocite citations (see https://pandoc.org/MANUAL.html#including-uncited-items-in-the-bibliography)
      if (descriptor.frontmatter != null && 'nocite' in descriptor.frontmatter) {
        let nocite: string[]|string = descriptor.frontmatter.nocite

        if (Array.isArray(nocite)) {
          nocite = nocite.map(e => e.replace('@', '').trim())
        } else if (nocite.includes(',')) {
          nocite = nocite.split(',').map(e => e.replace('@', '').trim())
        } else {
          nocite = [] // Some error
        }

        keys.push(...nocite)
      }

      const bibliography = await ipcRenderer.invoke('citeproc-provider', {
        command: 'get-bibliography',
        payload: {
          database: library,
          citations: [...new Set(keys)]
        }
      })

      this.bibliography = bibliography
    }
  }
})
</script>
