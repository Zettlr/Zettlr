<template>
  <div>
    <div class="form-control cb-group">
      <label class="checkbox"
             v-bind:disabled="disabled"
      >
        <input
          v-bind:id="fieldID"
          type="checkbox"
          v-bind:name="name"
          value="yes"
          v-bind:checked="value"
          v-bind:disabled="disabled"
          v-on:input="$emit('input', $event.target.checked)"
        >
        <span class="checkmark"></span>
      </label>
      <label v-if="label" v-bind:for="fieldID" v-bind:disabled="disabled"
             v-html="label"
      >
      </label>
    </div>
    <div v-if="info" class="form-control info">
      {{ info }}
    </div>
  </div>
</template>

<script>
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Checkbox
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This component represents a generic checkbox
 *
 * END HEADER
 */

export default {
  name: 'CheckboxField',
  props: {
    value: {
      type: Boolean,
      default: false
    },
    label: {
      type: String,
      default: ''
    },
    name: {
      type: String,
      default: ''
    },
    disabled: {
      type: Boolean,
      default: false
    },
    info: {
      type: String,
      default: ''
    }
  },
  computed: {
    fieldID: function () {
      return 'form-input-' + this.name
    }
  }
}
</script>

<style lang="less">
@input-size: 14px;

body {
  .cb-group {
    display: grid;
    grid-template-columns: @input-size * 2 auto;
    grid-template-rows: 100%;
    grid-template-areas: "input label";

    label:not(.checkbox):not(.radio) { grid-area: label; }
  }

  label.checkbox {
    position: relative;
    display: inline-block !important;
    width: @input-size;
    height: @input-size;
    padding: 0;
    margin-right: 5px;
    grid-area: input;
    // flex: 0.05; // 5% of available width. NOTE: The label's width is defined in Radio.vue!

    input {
      display: none !important;
    }

    .checkmark {
      position: absolute;
      top: 0;
      left: 0;
      height: @input-size;
      width: @input-size;
      border-radius: 4px;
      background-color: #eee;
      transition: background-color .2s ease;

      &:after {
        content: "";
        position: absolute;
        opacity: 0;
        left: 5px;
        top: 2px;
        width: 3px;
        height: 6px;
        border: solid white;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
        transition: opacity .2s ease;
      }
    }

    input:checked ~ .checkmark {
      background-color: var(--system-accent-color, --c-primary);

      &:after {
        opacity: 1;
      }
    }

    &[disabled] {
      input:checked ~ .checkmark {
        background-color: lightgrey;
      }
      input:checked ~ .checkmark {
        border-color: rgb(90, 90, 90);
      }
    }
  }

  label {
    &[disabled] {
      color: grey;
    }
  }

  div.info {
    color: grey;
    font-size: 80%;
  }
}

body.darwin {
  @input-size: 14px;

  label {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    font-size: 13px;
  }

  label.checkbox {
    width: @input-size;
    height: @input-size;
    grid-area: input;

    .checkmark {
      position: absolute;
      top: 0;
      left: 0;
      height: @input-size;
      width: @input-size;
      border-radius: 4px;
      border: 1px solid rgb(179, 179, 179);
      background-color: white;

      &:after {
        left: 4px;
        top: 1px;
        width: 3px;
        height: 6px;
        border: solid white;
        border-width: 0 2px 2px 0;
      }
    }

    input:checked ~ .checkmark {
      border-color: var(--system-accent-color, --c-primary);
      background-image: linear-gradient(transparent, #00000020);
    }

    &[disabled] .checkmark {
      background-color: #ddd;
    }
  }

  &.dark {
    label.checkbox {
      .checkmark {
        background-image: radial-gradient(circle at top, rgb(60, 60, 60), rgb(90, 90, 90));
        border-color: transparent;

        &:after {
          border-color: solid rgb(228, 228, 228);
        }
      }

      input:checked ~ .checkmark {
        background-image: none;
      }

      &[disabled] .checkmark {
        background-image: radial-gradient(circle at top, rgb(90, 90, 90), rgb(120, 120, 120));
      }
    }
  }
}

body.win32 {
  @input-size: 20px;
  label.checkbox {
    width: @input-size;
    height: @input-size;
    padding: 0;
    grid-area: input;

    .checkmark {
      position: absolute;
      top: 0;
      left: 0;
      height: @input-size;
      width: @input-size;
      border-radius: 0px;
      background-color: white;
      border: 2px solid rgb(90, 90, 90);

      &:after {
        content: "";
        position: absolute;
        opacity: 0;
        left: 4px;
        top: 0px;
        width: 6px;
        height: 10px;
        border: solid white;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
        transition: opacity 1s ease;
      }
    }

    input:checked ~ .checkmark:after {
      opacity: 1;
    }

    input:checked ~ .checkmark {
      border-color: var(--system-accent-color, --c-primary);
    }

    &[disabled] .checkmark {
      background-color: #ddd;
      border-color: rgb(120, 120, 120);
    }
  }
}

body.linux {
  @input-size: 14px;

  label {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    font-size: 13px;
  }

  label.checkbox {
    width: @input-size;
    height: @input-size;
    grid-area: input;

    .checkmark {
      position: absolute;
      top: 0;
      left: 0;
      height: @input-size;
      width: @input-size;
      border-radius: 4px;
      border: 1px solid rgb(179, 179, 179);
      background-color: rgb(230, 230, 230);
      background-image: linear-gradient(transparent, #00000020);

      &:after {
        left: 4px;
        top: 1px;
        width: 3px;
        height: 6px;
        border: solid white;
        border-width: 0 2px 2px 0;
      }
    }

    &[disabled] span.checkmark {
      background-color: #ffffff;
    }

    input:checked ~ .checkmark {
      background-color: rgb(230, 230, 230);

      &:after {
        border-color: rgb(80, 80, 80);
      }
    }
  }

  &.dark {
    label.checkbox {
      .checkmark {
        background-image: radial-gradient(circle at top, rgb(60, 60, 60), rgb(90, 90, 90));
        border-color: transparent;

        &:after {
          border-color: solid rgb(228, 228, 228);
        }
      }

      &[disabled] span.checkmark {
        background-image: radial-gradient(circle at top, rgb(112, 111, 111), rgb(156, 156, 156));
      }

      input:checked ~ .checkmark {
        background-image: none;
      }
    }
  }
}
</style>
