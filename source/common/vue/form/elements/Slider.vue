<template>
  <div class="slider-group">
    <p v-html="label"></p>
    <input
      type="range"
      v-bind:min="min"
      v-bind:max="max"
      v-bind:value="value"
      v-on:input="$emit('input', parseInt($event.target.value, 10))"
    >
  </div>
</template>

<script>
export default {
  name: 'SliderControl',
  props: {
    value: {
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
  methods: {
    fieldID: function (key) {
      return 'form-input-' + this.name + '-' + key
    }
  }
}
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
      }

      &::-webkit-slider-thumb {
        height: 20px;
        width: 8px;
        margin-top: -8px;
        border-radius: 5px;
        -webkit-appearance: none;
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
</style>
