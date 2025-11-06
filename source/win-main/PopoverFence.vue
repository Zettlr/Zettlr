<template>
  <PopoverWrapper v-bind:target="props.target" v-on:close="emit('close')">
    <div class="fenced-div">
      <TabBar
        v-bind:tabs="tabs"
        v-bind:current-tab="divType"
        v-on:tab="divType = $event as 'fence'|'bracket'"
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
        {{ insertFenceButtonLabel }}
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
  (e: 'insert-fence', value: { type: string, identifiers: string, classes: string, attributes: string }): void
}>()

const divType = ref<'fence'|'bracket'>('fence')

const identifierQuery = ref('')
const identifierPlaceholder: string = trans('#identifier')

const classesQuery = ref('')
const classesPlaceholder: string = trans('.classes')

const attributesQuery = ref('')
const attributesPlaceholder: string = trans('key=value')

const insertFenceButtonLabel = computed(() => trans(`Insert ${divType.value === 'fence' ? 'Fenced Div' : 'Bracketed Span'}`))

const tabs: TabbarControl[] = [
  { id: 'fence', label: trans('Fence'), target: 'fence' },
  { id: 'bracket', label: trans('Bracket'), target: 'bracket' },
]

function handleClick (): void {
  emit('insert-fence', { type: divType.value, identifiers: identifierQuery.value, classes: classesQuery.value, attributes: attributesQuery.value })
  emit('close')
}
</script>

<style lang="less">
body {
  .fenced-div {
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
