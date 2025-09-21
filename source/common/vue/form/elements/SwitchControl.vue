<template>
  <div v-bind:class="{ 'switch-group': true, stretch }">
    <label v-if="labelPosition === 'before' && label" v-bind:for="fieldID" v-html="label"></label>
    <label class="switch">
      <input
        v-bind:id="fieldID"
        type="checkbox" v-bind:name="name" value="yes"
        v-bind:checked="modelValue"
        v-on:input="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
      >
      <div class="toggle"></div>
    </label>
    <label v-if="labelPosition !== 'before' && label" v-bind:for="fieldID" v-html="label"></label>
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Switch
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This component displays a switch, that is: A glorified,
 *                  bigger checkbox input.
 *
 * END HEADER
 */

import { computed } from 'vue'

const props = defineProps<{
  /**
   * The model associated with this control
   */
  modelValue: boolean
  /**
   * The label associated with this control
   */
  label?: string
  /**
   * The label's position. By default, it is after the switch control.
   */
  labelPosition?: 'before'|'after'
  /**
   * The name of this switch control.
   */
  name?: string
  /**
   * By default, switch and label will be positioned next to each other. Setting
   * this to true makes the label and switch move to the opposite ends of the
   * available width.
   */
  stretch?: boolean
}>()

const fieldID = computed<string>(() => 'form-input-' + (props.name ?? ''))

const emit = defineEmits<(e: 'update:modelValue', value: boolean) => void>()

</script>

<style lang="less">
@input-size: 18px;
@input-margin: 2px;

body {
  div.switch-group {
    display: flex;
    gap: 10px;

    &.stretch {
      justify-content: space-between;
    }

    label {
      line-height: @input-size;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    }

    label.switch {
      position: relative;
      margin-right: 5px;
      width: @input-size * 2;
      height: @input-size;
      background-color: var(--grey-4);
      border-radius: @input-size;

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
        transition: .4s;
        border-radius: (@input-size / 2);
        box-shadow: inset 0px 0px 5px 0px rgba(0, 0, 0, .25);
        background-color: var(--grey-1);

        &:before {
          position: absolute;
          content: "";
          height: (@input-size - @input-margin * 2); // Fancy equations here!
          width: (@input-size - @input-margin * 2);
          box-shadow: @input-margin @input-margin 5px 0px rgba(0, 0, 0, .5);
          left: @input-margin;
          bottom: @input-margin;
          background-color: white;
          transform: translateX(0);
          transition: transform .4s ease;
          border-radius: 50%;
        }
      }

      input:checked + .toggle:before {
        transform: translateX((@input-size));
      }

      input:checked + .toggle {
        background-color: var(--system-accent-color, --c-primary);
      }
    }
  }
}
</style>
