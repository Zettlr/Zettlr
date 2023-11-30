<template>
  <div
    v-bind:id="`toolbar-${control.id}`"
    role="presentation"
    class="toolbar-text"
    v-bind:style="{
      textAlign: control.align
    }"
  >
    <strong v-if="control.style === 'strong'" v-html="control.content"></strong>
    <em v-else-if="control.style === 'emphasis'" v-html="control.content"></em>
    <span v-else v-html="control.content"></span>
  </div>
</template>

<script>
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

export default {
  name: 'TextControl',
  props: {
    control: {
      type: Object,
      default: function () { return {} }
    }
  }
}
</script>

<style lang="less">
body .toolbar-text {
  font-size: 11px;
  padding: 0 10px;
  width: 150px; // constrain the text width to accommodate content changes.
}
</style>
