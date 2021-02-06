<template>
  <div
    id="toolbar"
    v-bind:style="{ top: marginTop }"
  >
    <span>This is a toolbar</span>
  </div>
</template>

<script>
export default {
  name: 'Toolbar',
  props: {
    marginTop: {
      type: String,
      default: '0px'
    }
  },
  computed: {
  }
}
</script>

<style lang="less">
body.darwin {
  &.dark {
    // Dark styling
    div#toolbar {
      font-size: 14px;
      background-color: rgb(52, 52, 52);
      color: rgb(172, 172, 172);

      &:window-inactive {
        background-color: rgb(34, 34, 34);
        color: rgb(100, 100, 100);
      }
    }
  }
}
</style>
