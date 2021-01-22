<template>
  <!-- Mousedowns on the modal div make the dialog go away -->
  <div
    v-show="modalActive"
    class="modal"
    v-on:mousedown.stop="modalActive = false"
  >
    <!--
      Mousedowns on the dialog div, however, should not make the dialog go away.
      We are using mousedown instead of click, because this way we prevent
      closing of the modal if the user drags the mouse to select text,
      accidentally going over the modal and releasing the mouse.
    -->
    <div
      ref="dialog"
      class="dialog"
      v-on:mousedown.stop=""
    >
      <h1>Hello Vue!</h1>
      <p>A variable accessed from the store: {{ this.$store.state.selectedFile }}</p>
      <p>If this displays, it's working!</p>
      <div id="about">
        Dialog: ABOUT
      </div>
      <div id="custom-css">
        Dialog: CUSTOM CSS
      </div>
      <Clipboard v-if="dialog==='clipboard'"></Clipboard>
      <div id="error">
        Dialog: ERROR NOTIFICATION
      </div>
      <div id="paste-image">
        Dialog: PASTE IMAGE
      </div>
      <div id="preferences">
        Dialog: PREFERENCES (includes CSS, Tags, General, Import/Export)
      </div>
      <div id="project-settings">
        Dialog: PROJECT PREFERENCES
      </div>
      <div id="statistics">
        Dialog: STATISTICS
      </div>
      <div id="tag-cloud">
        Dialog: TAG CLOUD
      </div>
      <div id="update">
        Dialog: UPDATE CHANGELOG
      </div>
    </div>
  </div>
</template>

<script>
import Clipboard from './clipboard.vue'

const MIN_MARGIN_PX = 10

export default {
  name: 'Modal',
  components: {
    Clipboard
  },
  data: () => {
    return {
      modalActive: false,
      dialog: undefined // Holds the currently shown dialog
    }
  },
  computed: {},
  watch: {
    modalActive: function () {
      this.$nextTick(function () {
        this.place()
      })
    }
  },
  mounted: function () {
    window.addEventListener('resize', (event) => {
      this.place()
    }, { passive: true })
  },
  methods: {
    showDialog: function (type) {
      this.dialog = type
      this.modalActive = true
    },
    hideDialog: function () {
      this.dialog = undefined
      this.modalActive = false
    },
    /**
    * Place the dialog in the middle of the screen
    */
    place: function () {
      // Adjust the margins
      const diaH = this.$refs.dialog.offsetHeight
      const winH = window.innerHeight

      // If the dialog is smaller than the window plus 2 times the margin,
      // place it centered
      if (diaH < winH - 2 * MIN_MARGIN_PX) {
        const margin = (winH - diaH) / 2
        this.$refs.dialog.style.marginTop = margin + 'px'
      } else {
        // Otherwise enable scrolling while respecting the minimal margin
        this.$refs.dialog.style.marginTop = `${MIN_MARGIN_PX}px`
        this.$refs.dialog.style.marginBottom = `${MIN_MARGIN_PX}px`
      }
    }
  }
}
</script>
