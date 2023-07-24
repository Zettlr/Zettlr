<template>
  <!-- Token lists cannot be inline -->
  <div class="form-control">
    <label v-if="label" v-bind:for="fieldID" v-html="label"></label>
    <!-- Else: Normal input w/o reset button -->
    <div class="token-list" v-on:click="($refs.input as HTMLInputElement).focus()">
      <span
        v-for="(token, idx) in modelValue"
        v-bind:key="idx"
        class="token"
        v-on:click="removeToken(idx)"
      >
        {{ token }}
      </span>
      <input
        v-bind:id="fieldID"
        ref="input"
        v-model="inputValue"
        class="inline"
        type="text"
        v-on:keydown="handleKey"
      >
    </div>
  </div>
</template>

<script lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        TokenList
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Implements a token list (similar to, e.g., tag inputs in Wordpress).
 *
 * END HEADER
 */

export default {
  name: 'TokenList',
  props: {
    modelValue: {
      type: Array,
      default: function () { return [] }
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
  emits: ['update:modelValue'],
  data: function () {
    return {
      inputValue: ''
    }
  },
  computed: {
    fieldID: function () {
      return 'field-input-' + this.name
    }
  },
  methods: {
    handleKey: function (event: KeyboardEvent) {
      if (this.inputValue.trim() === '') {
        return
      }

      if (![ 'Space', 'Enter', 'Comma', 'Tab' ].includes(event.code)) {
        return
      }

      event.preventDefault()

      const arr = this.modelValue.map(token => token)
      // Don't add duplicates
      if (arr.includes(this.inputValue.trim()) === false) {
        arr.push(this.inputValue.trim())
        this.$emit('update:modelValue', arr)
      }
      this.inputValue = ''
    },
    removeToken: function (idx: number) {
      const arr = this.modelValue.map(token => token)
      arr.splice(idx, 1)
      this.$emit('update:modelValue', arr)
    }
  }
}
</script>

<style lang="less">
body {
  div.token-list {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    font-size: 12px;
    padding: 6px;
    cursor: text;

    .token {
      display: inline-block;
      background-color: rgba(90, 90, 90, 0.5);
      color: white;
      border-radius: 4px;
      margin: 2px;
      padding: 2px;
      cursor: default;

      &:hover {
        background-color: rgb(175, 56, 56);
      }
    }

    input {
      background-color: transparent;
      font-family: inherit;
      color: inherit;
      border: none;
    }
  }
  &.dark {
    div.token-list {
      .token {
        background-color: rgb(70, 70, 70);
        &:hover {
          background-color: rgb(110, 30, 30);
        }
      }

      input {
        background-color: transparent;
        font-family: inherit;
        color: inherit;
        border: none;
      }
    }
  }
}

body.win32 {
  div.token-list {
    .token {
      border-radius: 0px;
    }
  }
}
</style>
