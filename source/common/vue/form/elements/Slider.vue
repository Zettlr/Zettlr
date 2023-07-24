<template>
  <div class="slider-group">
    <label v-if="label !== ''" v-html="label"></label>
    <input
      type="range"
      v-bind:min="min"
      v-bind:max="max"
      v-bind:value="modelValue"
      v-bind:name="name"
      v-on:input="$emit('update:modelValue', parseInt(($event.target as HTMLInputElement).value, 10))"
      v-on:change="$emit('change', parseInt(($event.target as HTMLInputElement).value, 10))"
    >
  </div>
</template>

<script lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Slider
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This component displays a slider input element.
 *
 * END HEADER
 */

import { defineComponent } from 'vue'

export default defineComponent({
  name: 'SliderControl',
  props: {
    modelValue: {
      type: Number,
      default: 0
    },
    min: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: 100
    },
    label: {
      type: String,
      default: ''
    },
    name: {
      type: String,
      default: ''
    }
  },
  emits: [ 'update:modelValue', 'change' ]
})
</script>

<style lang="less">
@input-size: 14px;

body {
  .slider-group {
    break-inside: avoid;
  }
}

body.darwin {
  @input-size: 14px;

  .slider-group {
    margin: 6px 0px;

    input[type=range] {
      -webkit-appearance: none;
      width: 100%;
      background-color: transparent;
      border: none;

      &:focus {
        outline: none;
      }
      &::-webkit-slider-runnable-track {
        width: 100%;
        height: 4px;
        background-color: rgb(217, 217, 217);
        border: 1px solid rgb(213, 213, 213);
      }

      &::-webkit-slider-thumb {
        height: 20px;
        width: 8px;
        margin-top: -10px;
        border-radius: 5px;
        -webkit-appearance: none;
        background-color: white;
        border: 1px solid rgb(195, 195, 195);
        border-top-color: rgb(218, 218, 218);
      }
    }
  }

  &.dark {
    .slider-group {
      input[type="range"] {
        &::-webkit-slider-runnable-track {
          background-color: rgb(56, 56, 56);
          border-color: transparent;
        }

        &::-webkit-slider-thumb {
          background-color: rgb(145, 145, 145);
          border-color: transparent;
        }
      }
    }
  }
}

body.win32 {
  .slider-group {
    margin: 6px 0px;

    input[type=range] {
      -webkit-appearance: none;
      width: 100%;
      background-color: transparent;
      border: none;

      &:focus {
        outline: none;
      }

      &::-webkit-slider-runnable-track {
        width: 100%;
        height: 2px;
        background-color: rgb(130, 130, 130);
      }

      &::-webkit-slider-thumb {
        height: 15px;
        width: 15px;
        margin-top: -7px;
        border-radius: 50%;
        -webkit-appearance: none;
        background-color: red;
      }
    }
  }

  &.dark {
    .slider-group {
      input[type="range"] {
        &::-webkit-slider-runnable-track {
          background-color: rgb(80, 80, 80);
        }
      }
    }
  }
}

body.linux {
  @input-size: 14px;

  .slider-group {
    margin: 6px 0px;

    input[type=range] {
      -webkit-appearance: none;
      width: 100%;
      background-color: transparent;
      border: none;

      &:focus {
        outline: none;
      }
      &::-webkit-slider-runnable-track {
        width: 100%;
        height: 4px;
        background-color: rgb(217, 217, 217);
        border: 1px solid rgb(213, 213, 213);
      }

      &::-webkit-slider-thumb {
        height: 20px;
        width: 8px;
        margin-top: -10px;
        border-radius: 5px;
        -webkit-appearance: none;
        background-color: white;
        border: 1px solid rgb(195, 195, 195);
        border-top-color: rgb(218, 218, 218);
      }
    }
  }

  &.dark {
    .slider-group {
      input[type="range"] {
        &::-webkit-slider-runnable-track {
          background-color: rgb(56, 56, 56);
          border-color: transparent;
        }

        &::-webkit-slider-thumb {
          background-color: rgb(145, 145, 145);
          border-color: transparent;
        }
      }
    }
  }
}
</style>
