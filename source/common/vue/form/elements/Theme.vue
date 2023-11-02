<template>
  <div>
    <p id="theme-selection-label" v-html="label"></p>
    <div id="theme-container">
      <div
        v-for="(theme, index) in options"
        v-bind:key="index"
        class="theme-container-item"
      >
        <!-- NOTE: "index" here is not actually an index number but the theme's name -->
        <div
          v-bind:style="{
            color: theme.textColor,
            backgroundColor: theme.backgroundColor,
            fontFamily: theme.fontFamily
          }"
          v-bind:data-theme="index"
          class="theme-mockup"
          v-on:click="selectTheme(index)"
        >
          <div class="toolbar"></div>
          <div class="traffic-lights">
            <div class="traffic-light-close"></div>
            <div class="traffic-light-min"></div>
            <div class="traffic-light-full"></div>
          </div>
          <div
            class="file-list"
            v-bind:style="{ borderColor: theme.textColor }"
          >
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
        <!-- Now, add some metadata -->
        <div class="theme-metadata">
          <p class="theme-name">
            {{ theme.name }}:
          </p>
          <div
            v-if="index === modelValue"
            class="selected-button"
          >
            {{ selectedLabel }}
          </div>
          <div
            v-else
            class="not-selected-button"
            v-on:click="selectTheme(index)"
          >
            {{ selectLabel }}
          </div>
          <p>{{ theme.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Theme
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays a theme selector including preview.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'
import { defineComponent } from 'vue'

export interface ThemeDescriptor {
  name: string
  description: string
  textColor: string
  backgroundColor: string
  fontFamily: string
}

export default defineComponent({
  name: 'ThemeField',
  props: {
    label: {
      type: String,
      default: ''
    },
    modelValue: {
      type: String,
      required: true
    },
    options: {
      type: Object,
      required: true
    }
  },
  emits: ['update:modelValue'],
  computed: {
    selectedLabel: function () {
      return trans('selected')
    },
    selectLabel: function () {
      return trans('click to select')
    }
  },
  methods: {
    style: function (themeObject: ThemeDescriptor) {
      return `color: ${themeObject.textColor}; border-color: ${themeObject.textColor}; background-color: ${themeObject.backgroundColor}; font-family: ${themeObject.fontFamily}`
    },
    selectTheme: function (themeName: string) {
      this.$emit('update:modelValue', themeName)
    }
  }
})
</script>

<style lang="less">
/*
* This file contains theme mockup styles, as they are rather large and need
* their own space. It includes colouring taken from the variables of the
* respective themes.
*/

p#theme-selection-label { font-size: 13px; }

div#theme-container {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  justify-content: center;
  font-size: 13px;

  div.theme-container-item {
    padding: 20px;
    display: grid;
    grid-template-columns: 200px auto;
    grid-template-areas: "mockup description";

    div.theme-mockup {
      width: 200px;
      height: 150px;
      position: relative;
      grid-area: "mockup";
      overflow: hidden;
      border-radius: 5px;
      box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, .1);
      cursor: pointer;
      transition: 0.5s all ease;

      // On hover scale them up
      &:hover {
        transform: scale(1.2);
        box-shadow: 0px 0px 20px 0px rgba(0, 0, 0, .4);
      }

      /* Traffic lights */
      div.traffic-lights {
        position: absolute;
        top: 3px;
        left: 3px;
        display: flex;
        width: 30%;
        height: 12px;

        div.traffic-light-close,
        div.traffic-light-min,
        div.traffic-light-full {
          width: 10px;
          height: 10px;
          border-radius: 100%;
          margin: 2px;
        }

        // macOS traffic light colours
        div.traffic-light-close { background-color: rgb(238, 107, 96); }
        div.traffic-light-min   { background-color: rgb(246, 191, 80); }
        div.traffic-light-full  { background-color: rgb(101, 204, 88); }
      }

      // Toolbar
      div.toolbar {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 20px;
        background-color: rgba(240, 240, 240, 1);
      }

      // File list
      div.file-list {
        position: absolute;
        top: 20px;
        bottom:0px;
        left: 0px;
        width: 30%;
        display: flex;
        flex-direction: column;
        border-right: 1px solid transparent;
        background-color: rgba(0, 0, 0, .2);

        div.file-list-item {
          flex: 1;
          border-bottom: 1px solid transparent;
          border-color: inherit;
          font-size: 5px;

          /* No border on the last child */
          &:last-child { border-bottom: none; }
        }
      }

      // Editor
      div.editor {
        width: 70%;
        height: 100%;
        position: absolute;
        left: 30%;
        top: 0;

        p {
          height: 20px;
          font-size: 18px;
          margin-top: 50%;
          text-align: center;
        }
      }
    }

    div.theme-metadata {
      padding: 20px;
      grid-area: "description";

      p.theme-name {
        display: inline-block;
        font-weight: bold;
        margin-right: 5px;
      }

      div.selected-button, div.not-selected-button {
        display: inline-block;
        margin-bottom: 10px;
        border-radius: 4px;
        background-color: rgb(128, 228, 128);
        font-weight: bold;
        color: #333;
        padding: 4px;
      }

      div.not-selected-button {
        background-color: rgb(188, 188, 188);
        font-weight: normal;
        cursor: pointer;
      }
    }
  }
}
</style>
