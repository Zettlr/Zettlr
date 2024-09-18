<template>
  <PopoverWrapper v-bind:target="props.target" v-on:close="emit('close')">
    <div class="document-info">
      <table v-if="props.docInfo != null">
        <tbody>
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
  
          <tr v-if="props.docInfo.selections.length > 0">
            <td colspan="4">
              &nbsp;
            </td>
          </tr>
  
          <tr v-for="sel, idx in props.docInfo.selections" v-bind:key="idx">
            <td style="text-align:right">
              <strong>{{ sel.anchor.line }}:{{ sel.anchor.ch }}</strong>
            </td>
            <td><strong>&ndash;</strong></td>
            <td>
              <strong>{{ sel.head.line }}:{{ sel.head.ch }}</strong>
            </td>
            <td>{{ getWdSelectedLabel(shouldCountChars ? sel.chars : sel.words) }}</td>
          </tr>
        </tbody>
      </table>
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
import PopoverWrapper from './PopoverWrapper.vue'
import { computed } from 'vue'
import { type DocumentInfo } from '@common/modules/markdown-editor'

const wordsLabel = trans('words')
const charsLabel = trans('characters')
const noDocumentMessage = trans('No open document')

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

function getWdSelectedLabel (wordsOrChars: number): string {
  if (props.shouldCountChars) {
    return trans('%s characters', localiseNumber(wordsOrChars))
  } else {
    return trans('%s words', localiseNumber(wordsOrChars))
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
