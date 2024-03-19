<template>
  <div>
    <p v-html="projectsIntro"></p>

    <div id="project-container">
      <div class="project-box" onclick="window.location = 'https://github.com/dsifford/astrocite'">
        <h4 class="project-name">
          Astrocite
        </h4>
        <p class="project-description">
          A safe parser from BibTex to CSL JSON
        </p>
      </div>
      <div class="project-box" onclick="window.location = 'https://www.chartjs.org/'">
        <h4 class="project-name">
          Chart.js
        </h4>
        <p class="project-description">
          Simple HTML5 Charts using the &lt;canvas&gt; tag
        </p>
      </div>
      <div class="project-box" onclick="window.location = 'https://github.com/paulmillr/chokidar'">
        <h4 class="project-name">
          chokidar
        </h4>
        <p class="project-description">
          Minimal and efficient cross-platform file watching library
        </p>
      </div>
      <div class="project-box" onclick="window.location = 'https://github.com/Juris-M/citeproc-js'">
        <h4 class="project-name">
          citeproc.js
        </h4>
        <p class="project-description">
          A JavaScript implementation of the Citation Style Language (CSL)
        </p>
      </div>
      <div class="project-box" onclick="window.location = 'https://katex.org/'">
        <h4 class="project-name">
          KaTeX
        </h4>
        <p class="project-description">
          Fast math typesetting for the web
        </p>
      </div>
      <div class="project-box" onclick="window.location = 'http://lesscss.org/'">
        <h4 class="project-name">
          LESS
        </h4>
        <p class="project-description">
          The dynamic stylesheet language
        </p>
      </div>
      <div class="project-box" onclick="window.location = 'https://github.com/mermaid-js/mermaid/'">
        <h4 class="project-name">
          Mermaid.js
        </h4>
        <p class="project-description">
          Generation of diagrams and flowcharts from text in a similar manner as Markdown
        </p>
      </div>
      <div class="project-box" onclick="window.location = 'https://github.com/Wulf/nodehun'">
        <h4 class="project-name">
          nodehun
        </h4>
        <p class="project-description">
          The Hunspell binding for NodeJS that exposes as much of Hunspell as possible and also adds new features.
        </p>
      </div>
      <div class="project-box" onclick="window.location = 'http://showdownjs.com/'">
        <h4 class="project-name">
          Showdown.js
        </h4>
        <p class="project-description">
          A bidirectional Markdown to HTML converter written in JavaScript
        </p>
      </div>
      <div class="project-box" onclick="window.location = 'https://atomiks.github.io/tippyjs/'">
        <h4 class="project-name">
          Tippy.js
        </h4>
        <p class="project-description">
          Tooltip, popover, dropdown, and menu library
        </p>
      </div>
      <div class="project-box" onclick="window.location = 'https://github.com/laurent22/joplin-turndown/'">
        <h4 class="project-name">
          Turndown
        </h4>
        <p class="project-description">
          Convert HTML into Markdown with JavaScript
        </p>
      </div>
      <div class="project-box" onclick="window.location = 'https://www.typescriptlang.org/'">
        <h4 class="project-name">
          TypeScript
        </h4>
        <p class="project-description">
          TypeScript is a superset of JavaScript that compiles to clean JavaScript output
        </p>
      </div>
      <div class="project-box" onclick="window.location = 'https://vuejs.org/'">
        <h4 class="project-name">
          Vue.js
        </h4>
        <p class="project-description">
          Vue.js is a progressive, incrementally-adoptable JavaScript framework for building UI on the web
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ProjectsTab
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This component simply offers some explanation to the "bigger"
 *                  projects Zettlr uses under the hood.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'

const projectsIntro = trans('Zettlr also makes use of these projects:')
</script>

<style lang="less">
// Project boxes on the about panel

// About dialog project boxes
div#project-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  overflow: hidden;
  padding: 10px;

  div.project-box {
    flex: 1;
    border: 1px solid transparent;
    margin: 10px;
    padding: 10px;
    cursor: pointer;
    transition: 0.2s all ease;
    // width: 200px doesn't work as expected in flexbox
    min-width: 200px;
    max-width: 200px;
    border-color: var(--grey-2);
    background-color: var(--grey-1);

    &:hover {
      transform: scale(1.05);
      background-color: var(--grey-2);
    }

    h4.project-name, p.project-description {
      margin: 0;
      color: var(--grey-3);
    }
  }
}
</style>
