<template>
  <div class="sorter">
    <span class="sortName" v-on:click.stop="toggleSorting('name')">
      <span v-html="sortingNameIcon"></span>
      <!-- Same line to remove the nbsp added by Chrome -->
    </span><span class="sortTime" v-on:click.stop="toggleSorting('time')">
      <span v-html="sortingTimeIcon"></span>
    </span>
  </div>
</template>

<script>
module.exports = {
  props: [
    'sorting'
  ],
  name: 'sorter',
  computed: {
    sortingNameIcon: function () { return (this.sorting === 'name-up') ? '&#xf1c2;' : '&#xf1c1;' },
    sortingTimeIcon: function () { return (this.sorting === 'time-up') ? '&#xf1c3;' : '&#xf1c4;' }
  },
  methods: {
    toggleSorting: function (type) {
      this.$parent.toggleSorting(type)
    }
  }
}
</script>
