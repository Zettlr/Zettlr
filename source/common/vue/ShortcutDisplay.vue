<template>
  <div class="shortcut-wrapper">
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

const props = defineProps<{ shortcut: ExplodedShortcut }>()

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
    border: 1px solid rgb(180, 180, 180);
    border-radius: 4px;
    border-top-width: 2px;
    border-left-width: 2px;
    padding: 2px 4px;
  }
}
</style>
