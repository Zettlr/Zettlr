<template>
  <div>
    <p id="theme-selection-label" v-html="props.label"></p>
    <div id="theme-container">
      <div
        v-for="(theme, index) in props.options"
        v-bind:key="index"
        v-bind:class="{
          'theme-container-item': true,
          selected: props.modelValue === index
        }"
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
            <p>Aa</p>
          </div>
        </div>
        <!-- Now, add some metadata -->
        <div class="theme-metadata">
          <p class="theme-name">
            {{ theme.name }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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

export interface ThemeDescriptor {
  name: string
  description: string
  textColor: string
  backgroundColor: string
  fontFamily: string
}

const props = defineProps<{
  modelValue: string
  options: Record<string, ThemeDescriptor>
  label?: string
}>()

const emit = defineEmits<(e: 'update:modelValue', value: string) => void>()

function selectTheme (themeName: string): void {
  emit('update:modelValue', themeName)
}
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
  flex-direction: row;
  flex-wrap: wrap;
  font-size: 13px;
  justify-content: center;
  align-items: center;
  width:100%;

  div.theme-container-item {
    padding: 20px;
    flex: 0;
    text-align: center;
    opacity: 0.5;
    transition: 0.3s opacity ease;

    &:hover, &.selected {
      opacity: 1;
    }

    div.theme-mockup {
      width: 150px;
      height: 100px;
      aspect-ratio: 1 / 1;
      position: relative;
      overflow: hidden;
      border-radius: 5px;
      box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, .1);
      cursor: pointer;
      transition: 0.5s all ease;

      // On hover scale them up
      &:hover {
        // transform: scale(1.2);
        box-shadow: 0px 0px 20px 0px rgba(0, 0, 0, .4);
      }

      /* Traffic lights */
      div.traffic-lights {
        position: absolute;
        top: 3px;
        left: 3px;
        display: flex;
        height: 8px;

        div.traffic-light-close,
        div.traffic-light-min,
        div.traffic-light-full {
          width: 6px;
          height: 6px;
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
        height: 14px;
        background-color: rgba(240, 240, 240, 1);
      }

      // File list
      div.file-list {
        position: absolute;
        top: 14px;
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

      p.theme-name {
        display: inline-block;
        white-space: nowrap;
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
