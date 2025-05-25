<template>
  <div class="progress-bar-container">
    <progress
      v-bind:max="props.max ?? 100"
      v-bind:value="props.value ?? 0"
    >
      Progress: {{ props.value ?? 0 }} of {{ props.max ?? 100 }}
    </progress>
    <button
      v-if="props.interruptible === true"
      class="interrupt-button"
      v-on:click="emit('interrupt')"
    >
      <cds-icon shape="times" size="14"></cds-icon>
    </button>
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Progress
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This component represents a progress bar
 *
 * END HEADER
 */

const props = defineProps<{
  max?: number
  value?: number
  interruptible?: boolean
}>()

const emit = defineEmits<(e: 'interrupt') => void>()
</script>

<style lang="less">
body {
  .progress-bar-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 25px;

    progress {
      width: 100%;
      height: 6px;
      border-radius: 3px;
    }

    progress::-webkit-progress-bar {
      background-color: rgb(200, 200, 200);
      border-radius: 3px;
    }

    progress::-webkit-progress-value {
      background-color: var(--system-accent-color, --c-primary);
      border-radius: 3px;
      transition: 0.4s width ease;
    }

    .interrupt-button {
      border: none;
      min-width: auto;
      padding: 0;
      width: 15px;
      height: 15px;
      border-radius: 15px;
    }
  }
}

body.darwin {
  .progress-bar-container {

    progress {
      width: 100%;
      height: 6px;
      padding: 0 10px;
      border: 0;
      border-radius: 3px;
    }

    .interrupt-button {
      background-color: rgba(120, 120, 120, 0.5);
      color: white;
      mix-blend-mode: difference;
    }
  }
}

body.win32, body.linux {
  .progress-bar-container {
    progress {
      border: none;
    }

    .interrupt-button {
      border: none;
      margin-left: 10px;
      background-color: transparent;
      &:hover {
        background-color: rgb(200, 200, 200);
      }
    }
  }

  &.dark .progress-bar-container {
    .interrupt-button:hover {
      background-color: rgb(120, 120, 120);
    }
  }
}
</style>
