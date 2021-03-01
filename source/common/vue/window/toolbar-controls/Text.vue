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
}
</style>
