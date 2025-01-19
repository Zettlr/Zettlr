<template>
  <div v-bind:class="{ inline: inline === true, 'form-control': true }">
    <label v-if="label" v-bind:for="fieldID" v-html="label"></label>
    <div
      v-bind:class="{
        'input-text-button-group': true,
        'has-icon': searchIcon === true,
        'has-reset': reset !== undefined
      }"
    >
      <cds-icon v-if="searchIcon === true" shape="search" class="input-text-button-group-icon"></cds-icon>
      <input
        v-bind:id="fieldID"
        ref="textField"
        v-model="inputValue"
        type="text"
        v-bind:class="{ inline: inline === true }"
        v-bind:placeholder="placeholder"
        v-bind:autofocus="autofocus"
        v-bind:disabled="disabled"
        v-on:input="emit('update:modelValue', inputValue)"
        v-on:keyup.enter="emit('confirm', inputValue)"
        v-on:keyup.esc="emit('escape', inputValue)"
        v-on:blur="emit('blur', inputValue)"
      >
      <button
        v-if="reset !== undefined"
        type="button"
        class="input-reset-button"
        v-bind:title="resetLabel"
        v-on:click="emit('update:modelValue', typeof reset === 'boolean' ? '' : reset)"
      >
        <cds-icon shape="times"></cds-icon>
      </button>
    </div>
    <p v-if="info !== undefined" class="info" v-html="info"></p>
  </div>
</template>

<script setup lang="ts">
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
import { computed, ref, watch, toRef } from 'vue'

const props = defineProps<{
  autofocus?: boolean
  modelValue: string
  disabled?: boolean
  placeholder?: string
  label?: string
  name?: string
  reset?: string|boolean
  inline?: boolean
  info?: string
  searchIcon?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'confirm', value: string): void
  (e: 'escape', value: string): void
  (e: 'blur', value: string): void
}>()

const fieldID = computed<string>(() => 'field-input-' + (props.name ?? ''))
const textField = ref<HTMLInputElement|null>(null)

const inputValue = ref<string>(props.modelValue)

watch(toRef(props, 'modelValue'), () => {
  inputValue.value = props.modelValue
})

const resetLabel = trans('Reset')

function focus (): void {
  textField.value?.focus()
}

function select (): void {
  textField.value?.select()
}

defineExpose({ select, focus })
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
    padding: 2px 8px;
  }

  &.dark {
    div.form-control .input-text-button-group {
      background-color: rgb(90, 90, 90);
      color: white;
      border-color: rgb(120, 120, 120);
    }
  }
}

body.linux {
  div.form-control .input-text-button-group {
    background-color: white;
    border: 1px solid #b4b4b4;
    border-radius: 4px;
    min-width: 50px;
    padding: 2px 8px;
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
