<template>
  <PopoverWrapper v-bind:target="target" v-on:close="$emit('close')">
    <div class="document-info">
      <table>
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
    </div>
  </PopoverWrapper>
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
import PopoverWrapper from './PopoverWrapper.vue'
import { type PropType, defineComponent } from 'vue'
import { type DocumentInfo } from '@common/modules/markdown-editor'

export default defineComponent({
  name: 'PopoverDocInfo',
  components: {
    PopoverWrapper
  },
  props: {
    target: {
      type: HTMLElement,
      required: true
    },
    docInfo: {
      type: Object as PropType<DocumentInfo>,
      required: true
    },
    shouldCountChars: {
      type: Boolean,
      default: false
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
