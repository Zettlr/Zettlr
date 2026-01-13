<template>
  <PopoverWrapper v-bind:target="props.target" v-on:close="emit('close')">
    <div class="pandoc-div-span">
      <TabBar
        v-bind:tabs="tabs"
        v-bind:current-tab="pandocType"
        v-on:tab="pandocType = $event as 'div'|'span'"
      ></TabBar>
      <hr>
      <TextControl
        ref="identifiers"
        v-model="identifierQuery"
        v-bind:placeholder="identifierPlaceholder"
      ></TextControl>

      <TextControl
        ref="classes"
        v-model="classesQuery"
        v-bind:placeholder="classesPlaceholder"
      ></TextControl>

      <TextControl
        ref="attributes"
        v-model="attributesQuery"
        v-bind:placeholder="attributesPlaceholder"
      ></TextControl>
      <hr>
      <button v-on:click="handleClick">
        {{ insertPandocButtonLabel }}
      </button>
    </div>
  </PopoverWrapper>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Fenced Div and Bracketed Span Popover
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This popover allows a user to insert and configure
 *                  the identifier, classes, and key-value attributes
 *                  of a Pandoc fenced div or bracketed span.
 *
 * END HEADER
 */
import PopoverWrapper from '@common/vue/PopoverWrapper.vue'
import TextControl from '@common/vue/form/elements/TextControl.vue'
import TabBar, { type TabbarControl } from '@common/vue/TabBar.vue'
import { trans } from '@common/i18n-renderer'
import { ref, computed } from 'vue'

const props = defineProps<{
  target: HTMLElement
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'insert-pandoc', value: { type: string, attributes: string }): void
}>()

const pandocType = ref<'div'|'span'>('div')

const identifierQuery = ref('')
const identifierPlaceholder: string = trans('#identifier')

const classesQuery = ref('')
const classesPlaceholder: string = trans('.classes')

const attributesQuery = ref('')
const attributesPlaceholder: string = trans('key=value')

const insertPandocButtonLabel = computed(() => trans(`Insert ${pandocType.value === 'div' ? 'Fenced Div' : 'Bracketed Span'}`))

const tabs: TabbarControl[] = [
  { id: 'div', label: trans('Div'), target: 'div' },
  { id: 'span', label: trans('Span'), target: 'span' },
]

function handleClick (): void {
  const formatAttributes = (input: string, prefix: string, join: string = ' '): string =>
    input
      .trim()
      .split(/\s+/)
      .filter(word => word.trim() !== '')
      .map(word => word.startsWith(prefix) ? word : prefix + word)
      .join(join)

  const pandocAttributesString: string = formatAttributes(`${formatAttributes(formatAttributes(identifierQuery.value, '', '-'), '#')} ${formatAttributes(classesQuery.value, '.')} ${attributesQuery.value}`, '')

  emit('insert-pandoc', { type: pandocType.value, attributes: pandocAttributesString })
  emit('close')
}
</script>

<style lang="less">
body {
  .pandoc-div-span {
    margin: 5px;

    .system-tablist {
      padding: 0px;
      margin: 5px;

      button {
        margin: 0px;
      }
    }

    button {
      width: stretch;
      margin: 5px;
    }
  }
}
</style>
