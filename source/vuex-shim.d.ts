import type { Store } from 'vuex'

declare module '@vue/runtime-core' {
  // provide typings for `this.$store`
  import type { ZettlrState } from './win-main/store'
  interface ComponentCustomProperties {
    $store: Store<ZettlrState>
    $data: any
    // Provide types for the Popover component
    $showPopover: (
      component: typeof defineComponent,
      element: HTMLElement,
      initialData: any,
      callback?: null|((data: any) => void)
    ) => Popover
    $togglePopover: (
      component: ReturnType<typeof defineComponent>,
      element: HTMLElement,
      initialData: any,
      callback?: null|((data: any) => void)
    ) => Popover|undefined
    $closePopover: () => void
  }
}
