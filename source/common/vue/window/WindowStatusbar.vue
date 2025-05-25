<template>
  <div id="statusbar">
    <template v-for="(item, idx) in props.controls">
      <ButtonControl
        v-if="item.type === 'button'"
        v-bind:key="idx"
        v-bind:label="item.label"
        v-bind:icon="item.icon"
        v-bind:name="item.name"
        v-bind:disabled="item.disabled"
        v-bind:inline="true"
        v-bind:primary="item.buttonClass === 'primary'"
        v-on:click="emit('click', item.id)"
      ></ButtonControl>
      <span
        v-if="item.type === 'text'"
        v-bind:key="idx"
      >
        {{ item.label }}
      </span>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Statusbar
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays a statusbar at the bottom of a window.
 *
 * END HEADER
 */

// Regular form button, but a static text display
import ButtonControl from '../form/elements/ButtonControl.vue'

interface StatusbarButton {
  type: 'button'
  id: string
  label?: string
  icon?: string
  name?: string
  disabled?: boolean
  buttonClass?: 'primary'
}

interface StatusbarText {
  type: 'text'
  label: string
}

export type StatusbarControl = StatusbarButton|StatusbarText

const props = defineProps<{ controls: StatusbarControl[] }>()
const emit = defineEmits<(e: 'click', value: string) => void>()
</script>

<style lang="less">
div#statusbar {
  height: 60px;
  padding: 0px 20px;
  line-height: 60px;
  background-color: rgb(235, 235, 235); // TODO: Enable the status bar to be "invisible" and visible
  display: flex;
  justify-content: space-between;
  align-items: center;

  button {
    margin-right: 5px; // Increase spacing a little bit here
    &.primary {
      background-color: var(--system-accent-color, --c-primary);
      border-color: var(--system-accent-color, --c-primary);
      background-image: linear-gradient(transparent, #00000020);
      color: var(--system-accent-color-contrast, white);
    }
  }
}

body {
  &.dark {
    div#statusbar {
      background-color: rgb(30, 30, 30);
    }
  }
}
</style>
