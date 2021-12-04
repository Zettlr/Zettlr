import { Store } from 'vuex'

declare module '@vue/runtime-core' {
  // provide typings for `this.$store`
  interface ComponentCustomProperties {
    $store: Store<ZettlrState>
    $data: any
  }
}
