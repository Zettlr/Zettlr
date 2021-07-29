<template>
  <div>
    <div
      v-for="(theme, index) in options"
      v-bind:key="index"
      class="theme-container-item"
    >
      <div
        v-bind:style="style(theme)"
        v-bind:data-theme="index"
        class="theme-mockup"
        v-on:click="selectTheme(index)"
      >
        <div class="traffic-lights">
          <div class="traffic-light-close"></div>
          <div class="traffic-light-min"></div>
          <div class="traffic-light-full"></div>
        </div>
        <div class="toolbar"></div>
        <div class="file-list">
          <div class="file-list-item"></div>
          <div class="file-list-item"></div>
          <div class="file-list-item"></div>
          <div class="file-list-item"></div>
          <div class="file-list-item"></div>
          <div class="file-list-item"></div>
          <div class="file-list-item"></div>
          <div class="file-list-item"></div>
        </div>
        <div class="editor">
          <p>{{ theme.name }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Theme
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays a theme selector including preview. NOTE: Currently not in use.
 *
 * END HEADER
 */

export default {
  name: 'ThemeField',
  props: {
    options: {
      type: Object,
      default: function () { return {} }
    }
  },
  methods: {
    style: function (theme) {
      return `color: ${theme.textColor}; background-color: ${theme.backgroundColor}; font-family: ${theme.fontFamily}`
    },
    selectTheme: function (theme) {
      this.$emit('input', theme)
    }
  }
}
</script>
