<template>
  <WindowChrome
    v-bind:title="windowTitle"
    v-bind:titlebar="true"
    v-bind:menubar="false"
    v-bind:show-toolbar="true"
    v-bind:toolbar-controls="toolbarControls"
    v-bind:disable-vibrancy="true"
    v-on:toolbar-click="handleClick($event)"
  >
    <!-- v-bind:src="fileUrl" -->
    <div
      id="print-container"
      ref="printContainer"
    >
    </div>
  </WindowChrome>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Print
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This component displays the print window.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'
import WindowChrome from '@common/vue/window/WindowChrome.vue'
import { computed, onMounted, ref } from 'vue'
import { pathBasename, pathDirname, resolvePath } from '@common/util/renderer-path-polyfill'
import { type ToolbarControl } from '@common/vue/window/WindowToolbar.vue'
import { md2html } from 'source/common/modules/markdown-utils'
import { CITEPROC_MAIN_DB } from 'source/types/common/citeproc'
import extractYamlFrontmatter from 'source/common/util/extract-yaml-frontmatter'

const ipcRenderer = window.ipc

const toolbarControls: ToolbarControl[] = [
  {
    type: 'spacer',
    id: 'spacer-one',
    size: '5x'
  },
  {
    type: 'button',
    label: '',
    id: 'print',
    icon: 'printer'
  }
]

const searchParams = new URLSearchParams(window.location.search)
const filePath = searchParams.get('file') ?? ''

const windowTitle = computed(() => {
  if (filePath !== '') {
    document.title = pathBasename(filePath)
    return pathBasename(filePath)
  } else {
    document.title = trans('Print…')
    return trans('Print…')
  }
})

const printContainer = ref<HTMLDivElement|null>(null)

onMounted(async () => {
  if (filePath === '' || printContainer.value === null) {
    console.log({ filePath, cont: printContainer.value })
    return
  }

  const fileContents: string = await ipcRenderer.invoke('application', {
    command: 'get-file-contents',
    payload: filePath
  })

  const base = pathDirname(filePath)
  const { frontmatter } = extractYamlFrontmatter(fileContents)
  const library = frontmatter !== null && 'bibliography' in frontmatter && typeof frontmatter.bibliography === 'string' ? frontmatter.bibliography : CITEPROC_MAIN_DB
  printContainer.value.innerHTML = md2html(fileContents, window.getCitationCallback(library), undefined, {
    onImageSrc (src) {
      return 'safe-file://' + resolvePath(base, src)
    }
  })
})

function handleClick (buttonID?: string): void {
  if (buttonID === 'print') {
    // NOTE: Printing only works in production, as during development
    // contents are served from localhost:3000 (which gives a CORS error)
    window.print()
  }
}
</script>

<style lang="less">
#print-container {
  width: 100%;
  border: none;

  // Styles primarily copied from the Pandoc default HTML template to emulate
  // the old print preview:
  // https://github.com/jgm/pandoc/blob/main/data/templates/styles.html
  background-color: white;
  color: black;

  max-width: 36em;
  margin: 0 auto;
  padding: 50px;
  hyphens: auto;
  overflow-wrap: break-word;
  text-rendering: optimizeLegibility;
  font-kerning: normal;

  font-family: Georgia, 'Times New Roman', serif;
  font-size: 12pt;
  overflow-y: auto;
  line-height: 1.2;

  p {
    margin: 1em 0;
  }

  a, a:visited {
    color: #1a1a1a;
  }

  img, svg {
    max-width: 100%;
    height: auto;
  }

  :is(h1, h2, h3, h4, h5, h6):not(:first-child) {
    margin-top: 1.4em;
  }

  h5, h6 {
    font-size: 1em;
    font-style: italic;
  }

  h6 {
    font-weight: normal;
  }

  ol, ul {
    padding-left: 1.7em;
    margin-top: 1em;
  }

  li > ol, li > ul {
    margin-top: 0;
  }

  ul.task-list[class]{
    list-style: none;
  }
  ul.task-list li input[type="checkbox"] {
    font-size: inherit;
    width: 0.8em;
    margin: 0 0.8em 0.2em -1.6em;
    vertical-align: middle;
  }

  blockquote {
    margin: 1em 0 1em 1.7em;
    padding-left: 1em;
    border-left: 2px solid #e6e6e6;
    color: #606060;
  }

  code {
    font-family: Menlo, Monaco, Consolas, 'Lucida Console', monospace;
    font-size: 85%;
    margin: 0;
    hyphens: manual;
  }

  pre {
    margin: 1em 0;
    overflow: auto;
  }

  pre code {
    padding: 0;
    overflow: visible;
    overflow-wrap: normal;
  }

  hr {
    border: none;
    border-top: 1px solid #1a1a1a;
    height: 1px;
    margin: 1em 0;
  }

  table {
    margin: 1em 0;
    border-collapse: collapse;
    width: 100%;
    overflow-x: auto;
    display: block;
    font-variant-numeric: lining-nums tabular-nums;

    tbody {
      margin-top: 0.5em;
      border-top: 1px solid #1a1a1a;
      border-bottom: 1px solid #1a1a1a;
    }

    th {
      border-top: 1px solid #1a1a1a;
      padding: 0.25em 0.5em 0.25em 0.5em;
    }

    td {
      padding: 0.125em 0.5em 0.25em 0.5em;
    }

    header {
      margin-bottom: 4em;
      text-align: center;
    }
  }
}

@media print {
  // Do some modifications so that the window frame and other unwanted elements
  // are hidden from the print
  body, html {
    height: auto !important;
    overflow: auto;
  }
  body div#window-frame {
    display: initial;
  }
  body div#window-chrome {
    display: none;
  }

  #print-container {
    height: auto;
    overflow: hidden;
  }

  #print-container {
    background-color: transparent;

    p, h2, h3 {
      orphans: 3;
      widows: 3;
    }

    h2, h3, h4 {
      page-break-after: avoid;
    }
  }
}
</style>
