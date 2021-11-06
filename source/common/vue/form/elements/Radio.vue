<template>
  <div class="radio-group">
    <p v-html="label"></p>
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
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Radio
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This component contains a generic radio input.
 *
 * END HEADER
 */

export default {
  name: 'RadioControl',
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

    p { font-size: 13px; }
  }

  .cb-group {
    display: grid;
    grid-template-columns: @input-size * 2 auto;
    grid-template-rows: 100%;
    grid-template-areas: "input label";
  }

  .cb-group, .radio-group {
    margin: 6px 0px;
    label:not(.radio):not(.checkbox) { grid-area: label; }
  }

  label.radio {
    position: relative;
    display: inline-block !important;
    width: @input-size * 2;
    height: @input-size;
    grid-area: input;
    //flex: 0.05; // Basically 5% width

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
  @input-size: 14px;

  label {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }

  label.radio {
    width: @input-size;
    height: @input-size;
    padding: 0;
    margin-right: 5px;

    .toggle {
      border: 1px solid rgb(179, 179, 179);
      border-radius: @input-size;
      width: @input-size; // Prevent squashed inputs for long labels
      background-color: white;

      // Inner part
      &:before {
        height: 6px;
        width: 6px;
        left: 3px;
        top: 3px;
        background-color: white;
      }
    }

    input:checked + .toggle {
      background-color: var(--system-accent-color, --c-primary);
      border-color: var(--system-accent-color, --c-primary);
      background-image: linear-gradient(transparent, #00000020);
    }
  }

  &.dark {
    label.radio {

      .toggle {
        background: radial-gradient(circle at top, rgb(60, 60, 60), rgb(90, 90, 90));
        border-color: transparent;

        &:before {
          background-color: transparent;
        }
      }

      input:checked + .toggle {
        background: none;
        background-color: var(--system-accent-color, --c-primary);
        border-color: transparent;

        &:before {
          background-color: rgb(228, 228, 228);
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
    margin-right: 5px;

    input:checked + .toggle {
      border-color: var(--system-accent-color, --c-primary);
    }

    input:checked + .toggle:before {
      background-color: var(--system-accent-color, --c-primary);
    }

    .toggle {
      position: absolute;
      cursor: pointer;
      width: @input-size; // Prevent too small radio buttons
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

body.linux {
  @input-size: 14px;

  label {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }

  label.radio {
    width: @input-size;
    height: @input-size;
    padding: 0;

    .toggle {
      border: 1px solid rgb(179, 179, 179);
      border-radius: @input-size;
      width: @input-size;
      background-color: rgb(230, 230, 230);
      background-image: linear-gradient(transparent, #00000020);

      // Inner part
      &:before {
        height: 6px;
        width: 6px;
        left: 3px;
        top: 3px;
        background-color: transparent;
      }
    }

    input:checked + .toggle:before {
      background-color: rgb(80, 80, 80);
    }
  }

  &.dark {
    label.radio {

      .toggle {
        background: radial-gradient(circle at top, rgb(60, 60, 60), rgb(90, 90, 90));
        border-color: transparent;

        &:before {
          background-color: transparent;
        }
      }

      input:checked + .toggle {
        background: none;
        background-color: var(--system-accent-color, --c-primary);
        border-color: transparent;

        &:before {
          background-color: rgb(228, 228, 228);
        }
      }
    }
  }
}
</style>
