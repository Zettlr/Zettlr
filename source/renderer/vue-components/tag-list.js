module.exports = {
  props: [ 'tags' ],
  data: () => {
    return {
      // Nothing in here
    }
  },
  template: `
  <div class="taglist">
    <div v-for="tag in getTags" class="tagspacer">
      <div class="tag" v-on:click.stop="tagSearch" v-bind:data-name="tag.name" v-bind:data-tippy-content="tag.desc" v-bind:style="col(tag.color)"></div>
    </div>
  </div>
  `,
  computed: {
    getTags: function () { return this.$store.getters.tags(this.tags) }
  },
  methods: {
    col: function (col) {
      return 'background-color: ' + col
    },
    tagSearch: function (evt) {
      console.log('Starting search for tag ' + evt.target.dataset.name + '!')
    }
  }
}
