import { Store } from 'vuex'

declare module '@vue/runtime-core' {
  // provide typings for `this.$store`
  import { ZettlrState } from './win-main/store'
  interface ComponentCustomProperties {
    $store: Store<ZettlrState>
    $data: any
    // Provide types for the Popover component
    $showPopover: (
      component: typeof defineComponent,
      element: HTMLElement,
      initialData: any,
      callback?: Function|null
    ) => Popover
    $togglePopover: (
      component: ReturnType<typeof defineComponent>,
      element: HTMLElement,
      initialData: any,
      callback?: Function|null
    ) => Popover|undefined
    $closePopover: () => void
  }
}
