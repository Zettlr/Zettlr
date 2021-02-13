<template>
  <div id="about-general">
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
            style="margin-top: 5%" alt="Node.js Logo" title="Node.js"
          >
        </a>
      </div>
      <div class="flex">
        <a href="https://codemirror.net/">
          <img
            src="./assets/codemirror-official-logo.png"
            style="width:60%; margin:0 20%" alt="CodeMirror Logo"
            title="CodeMirror"
          >
        </a>
      </div>
      <div class="flex">
        <a href="https://citationstyles.org/">
          <img
            src="./assets/csl-official-logo.svg"
            style="margin-top: 25%" alt="Citation Style Language Logo"
            title="Citation Style Language (CSL)"
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

<script>
import { trans } from '../common/i18n'

export default {
  name: 'GeneralTab',
  data: function () {
    return {
      dialogIntro: trans('dialog.about.lead'),
      CSLInfo: trans('dialog.about.citationstyle'),
      nodeTrademark: trans('dialog.about.trademark')
    }
  }
}
</script>

<style lang="less">
div#about-general {
  * {
    // Reset the default removed margin on simple p-elements etc., which is
    // currently applied in the geometry CSS.
    margin: revert;
  }

  div.projects {
    display: flex;
    div.flex {
      flex: 1;

      img {
        max-width: 100%;
      }
    }
  }
}
</style>
