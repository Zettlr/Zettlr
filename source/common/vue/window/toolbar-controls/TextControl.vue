<template>
  <div
    v-bind:id="`toolbar-${props.control.id}`"
    role="presentation"
    class="toolbar-text"
    v-bind:style="{
      textAlign: props.control.align
    }"
  >
    <strong v-if="props.control.style === 'strong'" v-html="props.control.content"></strong>
    <em v-else-if="props.control.style === 'emphasis'" v-html="props.control.content"></em>
    <span v-else v-html="props.control.content"></span>
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Text
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Not to be confused with the form Text component. This one
 *                  here displays text read-only.
 *
 * END HEADER
 */

export interface ToolbarTextControl {
  type: 'text'
  style?: 'strong'|'emphasis'
  align: 'left'|'center'|'right'
  content: string
  // Allow arbitrary properties that we ignore
  [key: string]: any
}

const props = defineProps<{ control: ToolbarTextControl }>()
</script>

<style lang="less">
body .toolbar-text {
  font-size: 11px;
  text-wrap: nowrap;
  padding: 0 10px;
  width: 150px; // constrain the text width to accommodate content changes.
}
</style>
