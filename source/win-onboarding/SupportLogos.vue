<template>
  <p style="text-align: center; font-weight: bold;">
    {{ supportMessage }}
  </p>

  <p style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
    <button class="image-button" v-on:click="loadUrl('https://www.patreon.com/zettlr')">
      <img src="./img/patreon_logo_white.svg" height="16" />
      <img src="./img/patreon_word_white.svg" height="16" />
    </button>

    <button class="image-button" v-on:click="loadUrl('https://github.com/sponsors/nathanlesage')">
      <img src="./img/github_logo.svg" height="16" />
    </button>

    <button class="image-button" v-on:click="loadUrl('https://www.paypal.me/hendrikerz')">
      <img src="./img/paypal_logo_white.svg" height="16" />
    </button>
  </p>
</template>

<script setup lang="ts">
import { trans } from 'source/common/i18n-renderer'

const supportMessage = trans('Support the development of Zettlr')

function loadUrl (url: string) {
  window.location.href = url
}
</script>

<style lang="less">
button {
  &.image-button {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 5px;
  }
}
</style>
