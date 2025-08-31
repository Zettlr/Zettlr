<template>
  <div
    v-bind:id="`toolbar-${control.id}`"
    v-bind:class="{
      'three-way-toggle': true,
      'active': activeState !== undefined
    }"
  >
    <button
      role="button"
      v-bind:aria-pressed="isStateOneActive"
      v-bind:class="{
        'active': isStateOneActive,
        [control.activeClass]: control.activeClass !== undefined && isStateOneActive
      }"
      v-bind:title="control.stateOne.title"
      v-on:click="toggle('stateOne')"
    >
      <cds-icon v-if="control.stateOne.icon" v-bind:shape="control.stateOne.icon"></cds-icon>
    </button>
    <!-- Second state -->
    <button
      role="button"
      v-bind:aria-pressed="isStateTwoActive"
      v-bind:class="{
        'active': isStateTwoActive,
        [control.activeClass]: control.activeClass !== undefined && isStateTwoActive
      }"
      v-bind:title="control.stateTwo.title"
      v-on:click="toggle('stateTwo')"
    >
      <cds-icon v-if="control.stateTwo.icon" v-bind:shape="control.stateTwo.icon"></cds-icon>
    </button>
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ThreeWayToggle
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Specific implementation of a toggle with three states on the
 *                  toolbar. Basically uses two adjacent buttons to model three
 *                  states: No button pressed, first button pressed, and second
 *                  button pressed. For an example see the implementation of the
 *                  file manager/global search views in the main window.
 *
 * END HEADER
 */
import { ref, computed, watch } from 'vue'

export interface ToolbarThreeWayControl {
  type: 'three-way-toggle'
  id?: string
  stateOne: {
    id: string
    title: string
    icon: string
  }
  stateTwo: {
    id: string
    title: string
    icon: string
  }
  initialState: string|undefined
  // Allow arbitrary properties that we ignore
  [key: string]: any
}
const props = defineProps< { control: ToolbarThreeWayControl }>()
const emit = defineEmits<(e: 'toggle', value: string|undefined) => void>() // TODO

const activeState = ref<string|undefined>(props.control.initialState)

const controlActiveChanged = computed<string|undefined>(() => {
  return props.control.initialState
})

const isStateOneActive = computed<boolean>(() => {
  return activeState.value === props.control.stateOne.id
})

const isStateTwoActive = computed<boolean>(() => {
  return activeState.value === props.control.stateTwo.id
})

watch(controlActiveChanged, () => {
  activeState.value = props.control.initialState
})

function toggle (state: 'stateOne'|'stateTwo'): void {
  if (state === 'stateOne' && isStateOneActive.value) {
    // De-activate
    activeState.value = undefined
  } else if (state === 'stateOne') {
    // Activate state one
    activeState.value = props.control.stateOne.id
  } else if (state === 'stateTwo' && isStateTwoActive.value) {
    // De-activate
    activeState.value = undefined
  } else {
    // Activate state two
    activeState.value = props.control.stateTwo.id
  }

  emit('toggle', activeState.value)
}
</script>

<style lang="less">
body.darwin {
  div#toolbar div.three-way-toggle {
    border-radius: 4px;
    margin: 0 10px;
    border: 1px solid transparent;
    display: flex;

    &:hover { border-color: rgb(180, 180, 180); }
    &.active { background-color: rgb(230, 230, 230); }

    button {
      &:first-child {
        border-top-right-radius: 0px;
        border-bottom-right-radius: 0px;
      }
      &:last-child {
        border-top-left-radius: 0px;
        border-bottom-left-radius: 0px;
      }

      &.active { background-color: rgb(200, 200, 200); }
    }
  }

  &.dark div#toolbar div.three-way-toggle {
    &:hover { border-color: rgb(80, 80, 80); }
    &.active { background-color: rgb(60, 60, 60); }
    button.active { background-color: rgb(50, 50, 50); }
  }
}

body.win32 {
  div#toolbar div.three-way-toggle {
    margin: 0 10px;
    border: 2px solid transparent;
    display: flex;

    &:hover { border-color: rgb(180, 180, 180); }
    &.active { background-color: rgb(230, 230, 230); }
    button.active { background-color: rgb(200, 200, 200); }
  }

  &.dark div#toolbar div.three-way-toggle {
    &:hover { border-color: rgb(80, 80, 80); }
    &.active { background-color: rgb(60, 60, 60); }
    button.active { background-color: rgb(50, 50, 50); }
  }
}

body.linux {
  div#toolbar div.three-way-toggle {
    margin: 0 10px;
    border: 2px solid transparent;
    display: flex;

    button {
      margin: 0;
      border-radius: 0;
    }

    button:first-child {
      border-top-left-radius: 4px;
      border-bottom-left-radius: 4px;
      border-right: none;
    }

    button:last-child {
      border-top-right-radius: 4px;
      border-bottom-right-radius: 4px;
    }

    button.active { background-color: rgb(228, 228, 228); }
  }

  &.dark div#toolbar div.three-way-toggle {
    button.active { background-color: rgb(50, 50, 50); }
  }
}
</style>
