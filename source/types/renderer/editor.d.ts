/**
 * Okay, hear me out. We have the following situation: We have a toolbar, and
 * external components that want to tell the main editor to do something. But
 * Vue doesn't have a concept of events being passed down to child components
 * and since editors may now be nested arbitrarily deep, we have no direct way
 * of accessing the editors and tell them to do something. Basically, Vue's data
 * flow goes like this: Events flow up, and props flow down. That's it. So we're
 * using this hacky solution "misusing" props as events. This interface
 * represents all the potential editor commands that can be issued. The last
 * property can contain arbitrary data if required by the command. We'll be
 * passing this struct as a prop down to every EditorBranch and EditorPane into
 * the main editor components. Every editor instance then listens to these
 * events by watching property changes (i.e. when moveSection switches from true
 * to false) and testing if they are the last editor (the only identifying info
 * we can store in the state to not break things due to Vue's aggressive
 * reactivity). Then, the editors can act based on this info.
 *
 * One example:
 * 1. The app receives a jump to line-command. It then writes the necessary info
 *    (in this case, which line to jump to) into the `data` prop. That is not
 *    watched by the editors, but since it's part of the data structure, it will
 *    silently update in the background.
 * 2. Then, the app switches the jumpToLine-property (false->true or otherwise).
 *    Since that sub-property is being watched by the editors, it will trigger
 *    the watcher that then checks the lastLeafId in the state. If that
 *    corresponds to the editor's leaf ID, the editor calls the appropriate
 *    function locally, and executes the command, providing the data.
 */
export interface EditorCommands {
  jumpToLine: boolean
  moveSection: boolean
  readabilityMode: boolean
  addKeywords: boolean
  replaceSelection: boolean
  executeCommand: boolean
  data: any
}
