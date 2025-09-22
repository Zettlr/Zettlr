<template>
  <h1>{{ pageHeading }}</h1>

  <p>
    {{ outroStart }}
  </p>

  <p>
    {{ helpInfo }}
  </p>

  <div id="button-group">
    <button v-on:click="loadUrl('https://go.zettlr.com/discord')">
      {{ discordLabel }}
    </button>
    <button v-on:click="loadUrl('https://forum.zettlr.com/')">
      {{ forumLabel }}
    </button>
    <button v-on:click="loadUrl('https://github.com/Zettlr/Zettlr')">
      {{ sourceCodeLabel }}
    </button>
  </div>

  <SupportLogos></SupportLogos>
</template>

<script setup lang="ts">
import { trans } from 'source/common/i18n-renderer'
import SupportLogos from '../SupportLogos.vue'

const pageHeading = trans('You\'re All Set!')
const outroStart = trans('We wish you a great writing experience! Remember to take a look at the preferences to tweak Zettlr even more.')
const helpInfo = trans('If anything comes up, and you need help, encounter a bug, or have an idea for a new feature, please get in touch with us. Zettlr is maintained by a global community of excellent volunteers who will help you out.')

const discordLabel = trans('Join our Discord Server')
const forumLabel = trans('Join our Community Forum')
const sourceCodeLabel = trans('View Source Code on GitHub')

function loadUrl (url: string) {
  window.location.href = url
}
</script>

<style lang="less">
#button-group {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  align-items: flex-start;
  margin: 20px 0;
}
</style>
