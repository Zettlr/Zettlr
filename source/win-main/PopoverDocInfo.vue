<template>
  <div class="document-info">
    <table v-if="docInfo">
      <tr>
        <td colspan="3" style="text-align:right">
          <strong>{{ docInfo.words }}</strong>
        </td>
        <td>{{ wordsLabel }}</td>
      </tr>
      <tr>
        <td colspan="3" style="text-align:right">
          <strong>{{ docInfo.chars }}</strong>
        </td>
        <td>{{ charsLabel }}</td>
      </tr>
      <tr>
        <td colspan="3" style="text-align:right">
          <strong>{{ docInfo.chars_wo_spaces }}</strong>
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
          <strong>{{ sel.start.line }}:{{ sel.start.ch }}</strong>
        </td>
        <td><strong>&ndash;</strong></td>
        <td>
          <strong>{{ sel.end.line }}:{{ sel.end.ch }}</strong>
        </td>
        <td>{{ getWdSelectedLabel(sel.selectionLength) }}</td>
      </tr>
    </table>
    <p v-else>
      No document open. <!-- TODO: Translate! -->
    </p>
  </div>
</template>

<script>
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
import { trans } from '../common/i18n-renderer'

export default {
  name: 'PopoverDocInfo',
  components: {
  },
  data: function () {
    return {
      docInfo: null
    }
  },
  computed: {
    popoverData: function () {
      return {} // This popover doesn't return anything
    },
    wordsLabel: function () {
      return trans('gui.file_words')
    },
    charsLabel: function () {
      return trans('gui.file_chars')
    },
    withoutSpacesLabel: function () {
      return trans('gui.file_chars_wo_spaces')
    }
  },
  methods: {
    getWdSelectedLabel: function (words) {
      return trans('gui.words_selected', words)
    }
  }
}
</script>

<style lang="less">
body {
  .document-info {
    padding: 5px;
  }
}
</style>
