<template>
  <div id="about-general">
    <h1 id="main-heading">
      Zettlr {{ configStore.config.version }}
    </h1>
    <p id="uuid">
      UUID: {{ configStore.config.uuid }}
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
      <span v-html="CSLInfo + ' '"></span>
      <a href="https://citationstyles.org">CitationStyles.org</a>
    </p>
    <hr>
    <p v-html="LanguageToolInfo"></p>
    <hr>
    <p v-html="nodeTrademark"></p>
  </div>
</template>

<script setup lang="ts">
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
import { useConfigStore } from 'source/pinia'

const configStore = useConfigStore()

const dialogIntro = trans('Zettlr is a project by Hendrik Erz, licensed under the GNU GPL v3 license. It is Open Source, free of charge and based upon the Electron framework. Zettlr would like to thank the developers of Electron, the Node.js framework and the CodeMirror editor for their work. Without them, Zettlr would not be possible. Below you can find all projects that Zettlr uses.')
const CSLInfo = trans('Zettlr makes use of citeproc to display citations directly in the editor. To this end, Zettlr uses the CitationStyleLanguage (CSL) language and style files. The files have been shipped unaltered with author metadata. More information:')
const nodeTrademark = trans('All logos and brand names are subject to their rightful owners. Besides using their code, Zettlr is in no way affiliated with any of these projects. Node.js is a trademark of Joyent, Inc.')
const LanguageToolInfo = trans('Zettlr offers an integration with LanguageTool.org, a service provided by LanguageTooler GmbH. Using this service requires an internet connection and is subject to the privacy policy of LanguageTooler GmbH or the corresponding server that you use.') + ' <a href="https://languagetool.org/legal/privacy">View the Privacy Policy by LanguageTooler GmbH</a>.'
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
    font-family: Inconsolata, monospace;
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
