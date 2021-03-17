<template>
  <div id="global-search-pane">
    <h4>Search</h4>
    <TextControl
      v-model="query"
      v-bind:placeholder="'Find …'"
    ></TextControl>
    <p>Search results will appear here</p>
  </div>
</template>

<script>
import TextControl from '../common/vue/form/elements/Text'

export default {
  name: 'GlobalSearch',
  components: {
    TextControl
  },
  data: function () {
    return {
      query: ''
    }
  }
}
</script>

<style lang="less">
body div#global-search-pane {
  padding: 10px;
}
</style>
