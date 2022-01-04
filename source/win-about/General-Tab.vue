<template>
  <div id="about-general">
    <h1 id="main-heading">
      Zettlr {{ version }}
    </h1>
    <p id="uuid">
      UUID: {{ uuid }}
    </p>
    <p v-html="dialogIntro"></p>

    <div class="projects">
      <div class="flex">
        <a href="http://electronjs.org/">
          <img
            src="./assets/electron-official-logo.svg"
            alt="Electron Logo" title="Electron"
          >
        </a>
      </div>
      <div class="flex">
        <a href="https://nodejs.org/">
          <img
            src="./assets/nodejs-official-logo.png"
            style="" alt="Node.js Logo" title="Node.js"
          >
        </a>
      </div>
      <div class="flex">
        <a href="https://codemirror.net/">
          <img
            src="./assets/codemirror-official-logo.png"
            style="" alt="CodeMirror Logo"
            title="CodeMirror"
          >
        </a>
      </div>
      <div class="flex">
        <a href="https://citationstyles.org/">
          <img
            src="./assets/csl-official-logo.svg"
            style="" alt="Citation Style Language Logo"
            title="Citation Style Language (CSL)"
          >
        </a>
      </div>
      <div class="flex">
        <a href="https://www.pandoc.org">
          <img
            src="./assets/pandoc.svg"
            style="" alt="Pandoc"
            title="Pandoc"
          >
        </a>
      </div>
    </div>
    <hr>
    <p>
      <span v-html="CSLInfo"></span>
      <a href="https://citationstyles.org">CitationStyles.org</a>
    </p>
    <hr>
    <p v-html="nodeTrademark"></p>
  </div>
</template>

<script lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        GeneralTab
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains the initial tab for the about window.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'GeneralTab',
  data: function () {
    return {
      dialogIntro: trans('dialog.about.lead'),
      CSLInfo: trans('dialog.about.citationstyle'),
      nodeTrademark: trans('dialog.about.trademark')
    }
  },
  computed: {
    version: function () {
      return (global as any).config.get('version')
    },
    uuid: function () {
      return (global as any).config.get('uuid')
    }
  }
})
</script>

<style lang="less">
div#about-general {
  * {
    // Reset the default removed margin on simple p-elements etc., which is
    // currently applied in the geometry CSS.
    margin: revert;
  }

  h1#main-heading {
    margin-bottom: 0px;
  }

  p#uuid {
    font-family: Menlo, Monaco, 'Liberation Mono', 'Courier New', monospace;
    color: rgb(80, 80, 80);
    font-size: 80%;
    margin-top: 0px;
    user-select: text;
    cursor: text;
  }

  div.projects {
    display: flex;
    justify-content: space-between;
    align-items: center;

    div.flex {
      flex: 1;
      text-align: center;

      img {
        max-width: 100%;
      }
    }
  }
}
</style>
