<template>
  <div
    class="toolbar-search-container"
    role="search"
    v-on:click="input?.focus()"
  >
    <cds-icon shape="search" role="presentation"></cds-icon>
    <input
      v-bind:id="`toolbar-${props.control.id}`"
      ref="input"
      type="search"
      class="toolbar-search"
      v-bind:placeholder="props.control.placeholder"
      v-on:input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      v-on:keypress.enter="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Search
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Implements a search field for the toolbar. Depending on where
 *                  it's displayed, it can even fold itself!
 *
 * END HEADER
 */
import { ref } from 'vue'

const ipcRenderer = window.ipc

export interface ToolbarSearchControl {
  type: 'search'
  id?: string
  // Allow arbitrary properties that we ignore
  [key: string]: any
}

const props = defineProps<{ control: ToolbarSearchControl }>()

const emit = defineEmits<(e: 'update:modelValue', value: string) => void>()
const input = ref<HTMLInputElement|null>(null)

ipcRenderer.on('shortcut', (event, shortcut) => {
  if (shortcut === 'search') {
    input.value?.focus()
  }
})
</script>

<style lang="less">
body {
  .toolbar-search-container {
    position: relative;

    clr-icon {
      position: absolute;
      top: 2px;
      left: 2px;
    }

    .toolbar-search {
      // Make the search input itself invisible
      background-color: transparent !important;
      border: none !important; // TODO: Remove once the styles have been migrated
      padding-left: 24px;
    }
  }
}
body.darwin {
  .toolbar-search-container {
    border-radius: 4px;
    background-color: rgb(245, 245, 245);
    padding-left: 5px;
    width: 32px; // Hide the search bar initially, and reveal on focus
    height: 26px;
    transition: width 0.2s ease;

    &:hover:not(:focus-within) { background-color: rgb(230, 230, 230); }

    &:not(:focus-within) {
      padding: 4px 8px;

      // While the input is hidden anyway, we must reset the CLR-ICON's position
      cds-icon { position: initial; }
    }

    .toolbar-search {
      width: 0%;
      opacity: 0;
      &::placeholder { color: rgb(190, 190, 190); }
    }

    &:focus-within {
      width: initial; // Reset the width of the container
      height: initial;
      display: flex;
      align-items: center;
      border: 1px solid rgb(190, 190, 190);
    }

    &:focus-within .toolbar-search {
      width: 100%;
      opacity: 1;
    }
  }

  &.dark {
    .toolbar-search-container {
      background-color: rgb(51, 51, 51);
      &:hover:not(:focus-within) { background-color: rgb(60, 60, 60,); }

      .toolbar-search::placeholder {
        color: rgb(120, 120, 120);
      }

      &:focus-within { border: 1px solid rgb(120, 120, 120); }
    }
  }
}
</style>
