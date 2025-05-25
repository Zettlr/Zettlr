<template>
  <div id="sponsors-tab">
    <p>
      A special thanks goes out to the sponsors of Zettlr. Become one yourself
      and support us on our <a href="https://www.patreon.com/zettlr">Patreon page</a>!
    </p>
    <div id="sponsors-container">
      <div v-for="sponsor in sponsors" v-bind:key="sponsor.id" class="sponsor">
        <img src="./assets/medal_sponsor.svg" v-bind:title="sponsor.name">
        <p>
          {{ sponsor.name }}
          <a v-if="sponsor.link" v-bind:href="sponsor.link">{{ sponsor.link }}</a>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        SponsorsTab
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This tab displays the Patreon sponsors.
 *
 * END HEADER
 */

import ky from 'ky'
import { ref } from 'vue'

interface Sponsor {
  id: string
  name: string
  link?: string
}

const sponsors = ref<Sponsor[]>([])

ky('https://zettlr.com/api/sponsors')
  .then(response => {
    response.json<Sponsor[]>()
      .then(res => {
        sponsors.value = res
      })
      .catch(err => console.error(err))
  })
  .catch(e => console.error(e))
</script>

<style lang="less">
div#sponsors-tab {

  p {
    margin: revert;
  }

  div#sponsors-container {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-around;

    div.sponsor {
      flex: 1;
      width: 150px;
      text-align: center;
      margin: 10px;

      img {
        max-width: 60%;
      }
    }
  }
}
</style>
