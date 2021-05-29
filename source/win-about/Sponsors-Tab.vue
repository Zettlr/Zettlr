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

<script>
import ky from 'ky'

export default {
  name: 'SponsorsTab',
  data: function () {
    return {
      sponsors: []
    }
  },
  created: function () {
    ky('https://api.zettlr.com/v1/sponsors')
      .then((response) => {
        this.sponsors = JSON.parse(response.body)
      })
      .catch(e => console.error(e))
  }
}
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
