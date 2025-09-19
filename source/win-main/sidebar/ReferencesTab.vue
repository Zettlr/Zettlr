<template>
  <div role="tabpanel">
    <!-- References -->
    <h1>
      {{ referencesLabel }}
      <small v-if="bibliography !== undefined && bibliography[1].length > 0" class="word-count">
        {{ wordCountLabel }}
      </small>
    </h1>
    <!-- Will contain the actual HTML -->
    <div v-html="referenceHTML"></div>
  </div>
</template>

<script setup lang="ts">
import { trans } from '@common/i18n-renderer'
import { getBibliographyForDescriptor as getBibliography } from '@common/util/get-bibliography-for-descriptor'
import { isAbsolutePath, resolvePath } from '@common/util/renderer-path-polyfill'
import { CITEPROC_MAIN_DB } from '@dts/common/citeproc'
import { DP_EVENTS } from '@dts/common/documents'
import { type AnyDescriptor, type MDFileDescriptor } from '@dts/common/fsal'
import { onMounted, ref, computed, watch } from 'vue'
import { type DocumentsUpdateContext } from 'source/app/service-providers/documents'
import { useDocumentTreeStore } from 'source/pinia'
import type { CiteprocProviderIPCAPI } from 'source/app/service-providers/citeproc'
import localiseNumber from 'source/common/util/localise-number'
import { extractASTNodes, markdownToAST } from 'source/common/modules/markdown-utils'
import type { ASTNode, CitationNode } from 'source/common/modules/markdown-utils/markdown-ast'
import { hasMarkdownExt } from 'source/common/util/file-extention-checks'

const ipcRenderer = window.ipc
const documentTreeStore = useDocumentTreeStore()

// This function overwrites the getBibliographyForDescriptor function to ensure
// the library is always absolute. We have to do it this ridiculously since the
// function is called in both main and renderer processes, and we still have the
// issue that path-browserify is entirely unusable.
function getBibliographyForDescriptor (descriptor: MDFileDescriptor): string {
  const library = getBibliography(descriptor)

  if (library !== CITEPROC_MAIN_DB && !isAbsolutePath(library)) {
    return resolvePath(descriptor.dir, library)
  } else {
    return library
  }
}

const bibliography = ref<[{ bibstart: string, bibend: string }, string[]]|undefined>(undefined)

const referencesLabel = trans('References')
const activeFile = computed(() => documentTreeStore.lastLeafActiveFile)

/**
 * Takes the bibliography and returns a renderable HTML representation of it
 *
 * @return  {string}  The HTML contents as a string
 */
const referenceHTML = computed(() => {
  if (bibliography.value === undefined || bibliography.value[1].length === 0) {
    return `<p>${trans('There are no citations in this document.')}</p>`
  }

  return [
    bibliography.value[0].bibstart,
    ...bibliography.value[1],
    bibliography.value[0].bibend
  ].join('\n')
})

// Provides an approximate word count. This can be used to, e.g., gauge how many
// words the list of references will contain, which can be important if a there
// is a limit that includes the bibliography that needs to be maintained.
const approximateWordCount = computed(() => {
  if (bibliography.value === undefined) {
    return 0
  }

  return bibliography.value[1].map(x => x.split(/\s+/g).length).reduce((p, c) => p + c, 0)
})

const wordCountLabel = computed(() => trans('circa %s words', localiseNumber(approximateWordCount.value)))

watch(activeFile, () => {
  updateBibliography().catch(e => console.error('Could not update bibliography', e))
})

onMounted(() => {
  ipcRenderer.on('documents-update', (e, payload: { event: DP_EVENTS, context: DocumentsUpdateContext }) => {
    const { event, context } = payload
    // Update the bibliography if the active file has been saved
    if (event === DP_EVENTS.CHANGE_FILE_STATUS && context.status === 'modification') {
      const { filePath } = context

      if (filePath === activeFile.value?.path) {
        updateBibliography().catch(e => console.error('Could not update bibliography', e))
      }
    }
  })

  // Initial bibliography update
  updateBibliography().catch(e => console.error('Could not update bibliography', e))
})

/**
 * Updates the bibliography displayed in the sidebar based on the current
 * active file.
 */
async function updateBibliography (): Promise<void> {
  if (activeFile.value === undefined) {
    bibliography.value = undefined
    return
  }

  if (!hasMarkdownExt(activeFile.value.path)) {
    return
  }

  const descriptor: AnyDescriptor|undefined = await ipcRenderer.invoke('application', {
    command: 'get-descriptor',
    payload: activeFile.value.path
  })

  if (descriptor === undefined || descriptor.type !== 'file') {
    bibliography.value = undefined
    return
  }

  const fileContents: string = await ipcRenderer.invoke('application', {
    command: 'get-file-contents',
    payload: activeFile.value.path
  })

  const keys = extractASTNodes(markdownToAST(fileContents), 'Citation')
    .map((node: ASTNode) => (node as CitationNode).parsedCitation)
    .flatMap(c => c.items.map(item => item.id))

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

  bibliography.value = await ipcRenderer.invoke('citeproc-provider', {
    command: 'get-bibliography',
    payload: {
      database: getBibliographyForDescriptor(descriptor),
      citations: [...new Set(keys)]
    }
  } as CiteprocProviderIPCAPI)
}
</script>

<style lang="css" scoped>
small.word-count {
  font-size: 70%;
  font-style: italic;
  float: right;
}
</style>
