<template>
  <div class="split-view">
    <div ref="view1" class="view" v-bind:style="{ width: `${view1Width}px` }">
      <slot name="view1"></slot>
    </div>
    <div
      class="horizontal-resizer"
      v-bind:style="{ left: `${view1Width - 5}px` }"
      v-on:mousedown="beginViewResizing"
    ></div> <!-- Enable resizing of the view -->
    <div ref="view2" class="view" v-bind:style="{ width: `${view2Width}px` }">
      <slot name="view2"></slot>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SplitView',
  props: {
    split: {
      type: String,
      default: 'horizontal' // TODO: Not yet implemented b/c I don't need it yet
    },
    minimumSizePercent: {
      type: Number,
      default: 10
    },
    initialSizePercent: {
      type: Array,
      default: function () { return [ 50, 50 ] } // Default same width
    },
    initialTotalSize: {
      type: Number,
      default: window.innerWidth
    }
  },
  data: function () {
    const availableSize = this.initialTotalSize
    return {
      availableSize: availableSize,
      viewResizing: false,
      viewResizeX: 0,
      // Initial widths
      view1Width: availableSize * (this.initialSizePercent[0] / 100),
      view2Width: availableSize * (this.initialSizePercent[1] / 100),
      // Minimum widths
      view1WidthMin: availableSize * (this.minimumSizePercent / 100),
      view2WidthMin: availableSize * (this.minimumSizePercent / 100)
    }
  },
  created: function () {
    window.addEventListener('resize', this.onWindowResize)
  },
  destroyed: function () {
    window.removeEventListener('resize', this.onWindowResize)
  },
  methods: {
    onWindowResize: function (event) {
      // Save the current ratios before applying the new widths
      const view1Percent = this.view1Width / this.availableSize
      const view2Percent = this.view2Width / this.availableSize
      this.availableSize = this.$el.getBoundingClientRect().width
      this.view1Width = this.availableSize * view1Percent
      this.view2Width = this.availableSize * view2Percent
      // Don't forget to also update the minum widths
      this.view1WidthMin = this.availableSize * (this.minimumSizePercent / 100)
      this.view2WidthMin = this.availableSize * (this.minimumSizePercent / 100)
    },
    beginViewResizing: function (event) {
      this.viewResizing = true
      this.viewResizeX = event.clientX
      this.$el.addEventListener('mousemove', this.onViewResizing)
      this.$el.addEventListener('mouseup', this.endViewResizing)
    },
    onViewResizing: function (event) {
      if (this.viewResizing === false) {
        return
      }

      // x > 0 means: Direction -->
      // x < 0 means: Direction <--
      let offsetX = event.clientX - this.viewResizeX
      // Make sure the views don't get resized too much
      if (offsetX > 0 && this.view2Width > this.view2WidthMin) {
        // Increase view1 in size
        this.view1Width += offsetX
        this.view2Width = this.availableSize - this.view1Width
      } else if (offsetX < 0 && this.view1Width > this.view1WidthMin) {
        // Increase view2 in size
        this.view2Width -= offsetX
        this.view1Width = this.availableSize - this.view2Width
      }

      this.viewResizeX = event.clientX
    },
    /**
     * Stops resizing of the inner elements on release of the mouse button.
     * @param {MouseEvent} evt The associated event
     */
    endViewResizing: function (event) {
      this.viewResizing = false
      this.viewResizeX = 0
      this.$el.removeEventListener('mousemove', this.onViewResizing)
      this.$el.removeEventListener('mouseup', this.endViewResizing)
    }
  }
}
</script>

<style lang="less">
body div.split-view {
  position: relative;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100%;
  display: flex;

  div.horizontal-resizer {
    cursor: ew-resize;
    width: 5px;
    position: absolute;
    height: 100%;
    border-right: 1px solid rgb(213, 213, 213);
  }
}

body.dark div.split-view {
  div.horizontal-resizer {
    border-color: rgb(80, 80, 80);
  }
}
</style>
