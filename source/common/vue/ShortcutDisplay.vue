<template>
  <div
    v-bind:class="{
      'shortcut-wrapper': true,
      'muted': props.display === 'muted'
    }"
  >
    <template v-if="props.shortcut.altKey">
      <kbd>{{ altKeySymbol }}</kbd>
    </template>
    <template v-if="props.shortcut.ctrlKey">
      <kbd>{{ ctrlKeySymbol }}</kbd>
    </template>
    <template v-if="props.shortcut.modKey">
      <kbd>{{ modKeySymbol }}</kbd>
    </template>
    <template v-if="props.shortcut.shiftKey">
      <kbd>⇧</kbd>
    </template>
    <template v-if="props.shortcut.key">
      <kbd>{{ props.shortcut.key }}</kbd>
    </template>
  </div>
</template>

<script setup lang="ts">

interface ExplodedShortcut {
  altKey: boolean
  shiftKey: boolean
  modKey: boolean,
  ctrlKey: boolean,
  key: string
}

// Proper key symbols based on platform
const modKeySymbol = process.platform === 'darwin' ? '⌘' : '⊞'
const altKeySymbol = process.platform === 'darwin' ? '⎇' : 'Alt'
const ctrlKeySymbol = process.platform === 'darwin' ? '⌃' : 'Ctrl'

const props = defineProps<{
  shortcut: ExplodedShortcut
  display: 'muted'|'full'
}>()

</script>

<style lang="css" scoped>
div.shortcut-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;

  kbd {
    font-family: inherit;
    text-transform: uppercase;
    font-size: 10px;
    border: 1px solid #666;
    color: #666;
    background-color: #ffe;
    border-radius: 4px;
    border-bottom-width: 2px;
    border-right-width: 2px;
    padding: 2px 4px;
  }

  &.muted kbd {
    border-color: rgb(180, 180, 180);
    color: rgb(180, 180, 180);
  }
}

body.dark div.shortcut-wrapper {
  kbd {
    border-color: white;
    color: white;
    background-color: rgb(124, 124, 90);
  }

  &.muted kbd {
    border-color: rgb(180, 180, 180);
    color: rgb(180, 180, 180);
    background-color: rgb(114, 114, 104);
  }
}
</style>
