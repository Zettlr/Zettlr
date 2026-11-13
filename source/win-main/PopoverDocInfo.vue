<template>
  <PopoverWrapper v-bind:target="props.target" v-on:close="emit('close')">
    <div class="document-info">
      <template v-if="props.docInfo != null">
        <h2>{{ documentHeading }}</h2>
        <table>
          <tbody>
            <tr>
              <th colspan="3" style="text-align:right">
                {{ selectedWords }}
              </th>
              <td>{{ wordsLabel }}</td>
            </tr>
            <tr>
              <th colspan="3" style="text-align:right">
                {{ selectedChars }}
              </th>
              <td>{{ charsLabel }}</td>
            </tr>
          </tbody>
        </table>

        <template v-if="props.docInfo.selections.length > 0">
          <h2>{{ selectionsHeading }}</h2>
          <table>
            <tbody>
              <tr v-for="sel, idx in props.docInfo.selections" v-bind:key="idx">
                <td style="text-align: right;">
                  {{ sel.anchor.line }}:{{ sel.anchor.ch }}
                </td>
                <td>&ndash;</td>
                <td style="text-align: left;">
                  {{ sel.head.line }}:{{ sel.head.ch }}
                </td>
                <td>
                  <strong>{{ shouldCountChars ? selectedCharactersLabel(sel.chars) : selectedWordsLabel(sel.words) }}</strong>
                  <br>
                  <small><em>{{ shouldCountChars ? selectedWordsLabel(sel.words) : selectedCharactersLabel(sel.chars) }}</em></small>
                </td>
              </tr>
            </tbody>
          </table>
        </template>
      </template>
      <p v-else>
        {{ noDocumentMessage }}
      </p>
    </div>
  </PopoverWrapper>
</template>

<script setup lang="ts">
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
import PopoverWrapper from '@common/vue/PopoverWrapper.vue'
import { computed } from 'vue'
import { type DocumentInfo } from '@common/modules/markdown-editor'

const documentHeading = trans('Document')
const selectionsHeading = trans('Selections')
const wordsLabel = trans('words')
const charsLabel = trans('characters')
const noDocumentMessage = trans('No open document')

function selectedWordsLabel (words: number): string {
  return trans('%s words', localiseNumber(words))
}

function selectedCharactersLabel (characters: number): string {
  return trans('%s characters', localiseNumber(characters))
}

const props = defineProps<{
  target: HTMLElement
  docInfo: DocumentInfo|undefined
  shouldCountChars: boolean
}>()

const emit = defineEmits<(e: 'close') => void>()

const selectedWords = computed(() => {
  if (props.docInfo == null) {
    return '0'
  } else {
    return localiseNumber(props.docInfo.words)
  }
})

const selectedChars = computed(() => {
  if (props.docInfo == null) {
    return '0'
  } else {
    return localiseNumber(props.docInfo.chars)
  }
})
</script>

<style lang="css" scoped>
.document-info {
  padding: 5px;

  table {
    font-variant-numeric: tabular-nums;

    tr {
      vertical-align: top;
    }
  }
}
</style>
