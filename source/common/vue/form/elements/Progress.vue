<template>
  <div class="progress-bar-container">
    <progress
      v-bind:max="max"
      v-bind:value="value"
    >
      Progress: {{ value }} of {{ max }}
    </progress>
    <button
      v-if="interruptible"
      class="interrupt-button"
      v-on:click="$emit('interrupt')"
    >
      <clr-icon shape="times" size="14"></clr-icon>
    </button>
  </div>
</template>

<script>
export default {
  name: 'ProgressBar',
  props: {
    /**
     * The target for this progress element
     */
    max: {
      type: Number,
      default: 1
    },
    /**
     * The current value of this progress element
     */
    value: {
      type: Number,
      default: 0
    },
    /**
     * Can the process displayed be interrupted?
     */
    interruptible: {
      type: Boolean,
      default: false
    }
  }
}
</script>

<style lang="less">
body.darwin {
  .progress-bar-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 25px;

    progress {
      width: 100%;
      height: 6px;
      padding: 0 10px;
      border: 0;
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
      // TODO: Better alignment
      border: none;
      background-color: rgb(120, 120, 120);
      color: rgb(230, 230, 230);
      line-height: 5px;
      display: flex;
      width: 15px;
      height: 15px;
      border-radius: 15px;
    }
  }

  &.dark .progress-bar-container {}
}
</style>
