<template>
  <div class="radio-group">
    <p>{{ label }}</p>
    <div
      v-for="(optionLabel, key) in options"
      v-bind:key="key"
      class="cb-group"
    >
      <label class="radio">
        <input
          v-bind:id="fieldID(key)"
          type="radio" v-bind:name="name" v-bind:value="key"
          v-bind:checked="value === key"
          v-on:input="$emit('input', $event.target.value)"
        >
        <div class="toggle"></div>
      </label>
      <label v-bind:for="fieldID(key)">{{ optionLabel }}</label>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FieldText',
  props: {
    value: {
      type: String,
      default: ''
    },
    label: {
      type: String,
      default: ''
    },
    name: {
      type: String,
      default: ''
    },
    options: {
      type: Object,
      default: function () { return {} }
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
  .radio-group {
    break-inside: avoid;
  }

  label.radio {
    position: relative;
    display: inline-block !important;
    width: @input-size;
    height: @input-size;
    padding: 0;

    input {
      display: none !important;
    }

    .toggle {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: @input-size;
      transition: .4s;

      // Inner part
      &:before {
        position: absolute;
        content: "";
        height: (@input-size * 0.6);
        width: (@input-size * 0.6);
        left: (@input-size * 0.2);
        top: (@input-size * 0.2);
        background-color: transparent;
        border-radius: @input-size;
        transition: .4s;
      }
    }
  }
}

body.darwin {
  @input-size: 16px;

  label {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }

  .cb-group, .radio-group {
    margin: 6px 0px;
  }

  label.radio {
    width: @input-size;
    height: @input-size;
    padding: 0;

    .toggle {
      border: 1px solid var(--grey-1);
      border-radius: @input-size;
      background-color: white;

      // Inner part
      &:before {
        height: 6px;
        width: 6px;
        left: 4px;
        top: 4px;
        background-color: white;
      }
    }

    input:checked + .toggle {
      background-color: var(--system-accent-color, --c-primary);
    }
  }

  &.dark {
    label.radio {
      input:checked + .toggle:before {
        background-color: white;
      }

      .toggle {
        background-color: rgb(90, 90, 90);
        border-color: rgb(100, 100, 100);

        &:before {
          background-color: rgb(90, 90, 90);
        }
      }
    }
  }
}

body.win32 {
  @input-size: 20px;

  label.radio {
    width: @input-size;
    height: @input-size;

    input:checked + .toggle {
      border-color: var(--system-accent-color, --c-primary);
    }

    input:checked + .toggle:before {
      background-color: var(--system-accent-color, --c-primary);
    }

    .toggle {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: white;
      border-radius: @input-size;
      border: 2px solid rgb(90, 90, 90);

      // Inner part
      &:before {
        position: absolute;
        content: "";
        height: (@input-size * 0.5);
        width: (@input-size * 0.5);
        left: (@input-size * 0.25 - 2px);
        top: (@input-size * 0.25 - 2px);
        background-color: transparent;
        border-radius: @input-size;
        transition: .4s;
      }
    }
  }
}
</style>
