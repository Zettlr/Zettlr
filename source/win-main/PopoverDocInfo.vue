<template>
  <div class="document-info">
    <table v-if="docInfo">
      <tr>
        <td colspan="3" style="text-align:right">
          <strong>{{ selectedWords }}</strong>
        </td>
        <td>{{ wordsLabel }}</td>
      </tr>
      <tr>
        <td colspan="3" style="text-align:right">
          <strong>{{ selectedChars }}</strong>
        </td>
        <td>{{ charsLabel }}</td>
      </tr>
      <tr>
        <td colspan="3" style="text-align:right">
          <strong>{{ selectedCharsWithout }}</strong>
        </td>
        <td>{{ withoutSpacesLabel }}</td>
      </tr>

      <tr v-if="docInfo.selections.length > 0">
        <td colspan="4">
          &nbsp;
        </td>
      </tr>

      <tr v-for="sel, idx in docInfo.selections" v-bind:key="idx">
        <td style="text-align:right">
          <strong>{{ sel.anchor.line }}:{{ sel.anchor.ch }}</strong>
        </td>
        <td><strong>&ndash;</strong></td>
        <td>
          <strong>{{ sel.head.line }}:{{ sel.head.ch }}</strong>
        </td>
        <td>{{ getWdSelectedLabel(shouldCountChars ? sel.chars : sel.words) }}</td>
      </tr>
    </table>
    <p v-else>
      {{ noDocumentLabel }}
    </p>
  </div>
</template>

<script lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Document Info Popover
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A popover showing more extensive statistics about the current doc.
 *
 * END HEADER
 */
import { trans } from '@common/i18n-renderer'
import localiseNumber from '@common/util/localise-number'
import { defineComponent } from 'vue'
import { DocumentInfo } from '@common/modules/markdown-editor'

export default defineComponent({
  name: 'PopoverDocInfo',
  components: {
  },
  data: function () {
    return {
      docInfo: null as null|DocumentInfo,
      shouldCountChars: false
    }
  },
  computed: {
    popoverData: function () {
      return {} // This popover doesn't return anything
    },
    noDocumentLabel: function () {
      return trans('No open document')
    },
    wordsLabel: function () {
      return trans('words')
    },
    charsLabel: function () {
      return trans('characters')
    },
    withoutSpacesLabel: function () {
      return trans('characters (w/o spaces)')
    },
    selectedWords: function (): string {
      if (this.docInfo === null) {
        return '0'
      } else {
        return localiseNumber(this.docInfo.words)
      }
    },
    selectedChars: function () {
      if (this.docInfo === null) {
        return '0'
      } else {
        return localiseNumber(this.docInfo.chars)
      }
    },
    selectedCharsWithout: function () {
      if (this.docInfo === null) {
        return '0'
      } else {
        return localiseNumber(this.docInfo.chars_wo_spaces)
      }
    }
  },
  methods: {
    getWdSelectedLabel: function (wordsOrChars: number) {
      if (this.shouldCountChars) {
        return trans('%s characters', localiseNumber(wordsOrChars))
      } else {
        return trans('%s words', localiseNumber(wordsOrChars))
      }
    }
  }
})
</script>

<style lang="less">
body {
  .document-info {
    padding: 5px;
  }
}
</style>
