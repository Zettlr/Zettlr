<template>
  <div v-bind:class="{ 'inline': inline, 'form-control': true }">
    <label v-if="label" v-bind:for="fieldID" v-html="label"></label>
    <div
      v-bind:class="{
        'input-text-button-group': true,
        'has-icon': searchIcon,
        'has-reset': reset
      }"
    >
      <cds-icon v-if="searchIcon" shape="search" class="input-text-button-group-icon"></cds-icon>
      <input
        v-bind:id="fieldID"
        ref="input"
        type="text"
        v-bind:value="modelValue"
        v-bind:class="{ 'inline': inline }"
        v-bind:placeholder="placeholder"
        v-bind:autofocus="autofocus"
        v-bind:disabled="disabled"
        v-on:input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        v-on:keyup.enter="$emit('confirm', ($event.target as HTMLInputElement).value)"
        v-on:keyup.esc="$emit('escape', ($event.target as HTMLInputElement).value)"
        v-on:blur="$emit('blur', ($event.target as HTMLInputElement).value)"
      >
      <button
        v-if="reset"
        type="button"
        class="input-reset-button"
        v-bind:title="resetLabel"
        v-on:click="resetValue"
      >
        &times;
      </button>
    </div>
    <p v-if="info !== ''" class="info" v-html="info"></p>
  </div>
</template>

<script lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Text
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A text input.
 *
 * END HEADER
 */
import { trans } from '@common/i18n-renderer'
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'FieldText',
  props: {
    autofocus: {
      type: Boolean,
      default: false
    },
    modelValue: {
      type: String,
      default: ''
    },
    disabled: {
      type: Boolean,
      default: false
    },
    placeholder: {
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
    reset: {
      type: [ String, Boolean ],
      default: false
    },
    inline: {
      type: Boolean,
      default: false
    },
    info: {
      type: String,
      default: ''
    },
    searchIcon: {
      type: Boolean,
      default: false
    }
  },
  emits: [ 'update:modelValue', 'confirm', 'escape', 'blur' ],
  computed: {
    fieldID: function () {
      return 'field-input-' + this.name
    },
    resetLabel: function () {
      return trans('Reset')
    },
    inputRef (): HTMLInputElement {
      return this.$refs.input as HTMLInputElement
    }
  },
  methods: {
    resetValue: function (event: MouseEvent) {
      const resetVal = typeof this.reset === 'string' ? this.reset : ''
      this.inputRef.value = resetVal
      this.focus()
      this.$emit('update:modelValue', resetVal)
    },
    focus: function () {
      this.inputRef.focus()
    },
    select: function () {
      this.inputRef.select()
    }
  }
})
</script>

<style lang="less">
body div.form-control {
  .input-text-button-group {
    display: grid;
    grid-template-columns: 20px auto 20px;
    grid-template-areas: "text text text";
    justify-items: center;
    align-items: center;

    &.has-icon:not(.has-reset) { grid-template-areas: "icon text text"; }
    &.has-reset:not(.has-icon) { grid-template-areas: "text text reset"; }
    &.has-reset.has-icon { grid-template-areas: "icon text reset"; }

    .input-text-button-group-icon { grid-area: icon; }

    input {
      background-color: transparent;
      grid-area: text;
      border-radius: 0px;
      border: none;
    }

    button.input-reset-button {
      grid-area: reset;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 100%;
      width: 14px;
      height: 14px;
      min-width: auto;
      flex: none;
      border: none;
      padding: 0;
      background-color: rgb(225, 225, 225);
      color: rgb(50, 50, 50);
      border-radius: 7px;
    }
  }

  p.info {
    font-size: 70%;
    opacity: 0.8;
  }
}

body.darwin {
  div.form-control .input-text-button-group {
    font-family:  -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    font-size: 13px;
    background-color: white;
    border: 1px solid rgb(210, 210, 210);
    border-bottom-color: rgb(180, 180, 180);
    border-radius: 6px;
    padding: 2px 4px;
    transition: 0.1s outline;

    &:focus-within {
      outline: var(--system-accent-color) solid 3px;
    }
  }

  &.dark {
    div.form-control .input-text-button-group {
      color: rgb(215, 215, 215);
      border-color: transparent;
      background-color: rgb(85, 85, 85);
      border-top-color: rgb(100, 100, 100);
    }
  }
}

body.win32 {
  div.form-control .input-text-button-group {
    background-color: white;
    border: 2px solid rgb(90, 90, 90);
    border-radius: 0px;
    min-width: 50px;
    padding: 8px 8px;
  }

  &.dark {
    div.form-control .input-text-button-group {
      background-color: rgb(90, 90, 90);
      color: white;
      border-color: rgb(120, 120, 120);
    }
  }
}
</style>
