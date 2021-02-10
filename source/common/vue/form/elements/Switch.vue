<template>
  <div class="switch-group">
    <label class="switch">
      <input
        v-bind:id="fieldID"
        type="checkbox" v-bind:name="name" value="yes"
        v-bind:checked="value"
        v-on:input="$emit('input', $event.target.checked)"
      >
      <div class="toggle"></div>
    </label>
    <label v-if="label" v-bind:for="fieldID">{{ label }}</label>
  </div>
</template>

<script>
export default {
  name: 'SwitchField',
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
@input-size: 18px;
@input-margin: 2px;

body {
  div.switch-group label {
    line-height: @input-size;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }

  label.switch {
    position: relative;
    display: inline-block !important;
    width: @input-size * 2;
    height: @input-size;
    margin:0 !important;
    padding: 0;
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
</style>
