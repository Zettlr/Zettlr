/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Notification provider
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Provides notification functionality to the whole application.
 *
 * END HEADER
 */

import {
  nativeImage,
  Notification
} from 'electron'
import path from 'path'
import broadcastIpcMessage from '../../common/util/broadcast-ipc-message'

export default class NotificationProvider {
  private readonly _osSupportsNotification: boolean
  private readonly _icon: nativeImage

  constructor () {
    global.log.verbose('Notification provider booting up ...')
    this._osSupportsNotification = Notification.isSupported()
    this._icon = nativeImage.createFromPath(path.join(__dirname, '../../common/img/image-preview.png'))
    // Inject the global notification methods so that everyone has an easy time
    // broadcasting those messages to all windows involved.
    global.notify = {
      /**
       * Displays a notification with normal urgency across the app
       *
       * @param   {string}   msg       The message
       * @param   {boolean}  showInOS  Whether to also initiate an OS notification
       */
      normal: (msg: string, showInOS: boolean = false) => {
        broadcastIpcMessage('notification-provider', 'normal', msg)
        if (this._osSupportsNotification && showInOS) {
          let notification = new Notification({
            title: 'Zettlr',
            body: msg,
            silent: true,
            icon: this._icon,
            hasReply: false, // macOS only
            timeoutType: 'default', // Windows/Linux only
            urgency: 'low', // Linux only, we don't want to distract too much
            closeButtonText: '' // macOS only, empty means to use localized text
          })

          // Now show the notification
          notification.show()
        }
      },
      /**
       * Displays a notification with critical urgency across the app
       *
       * @param   {ErrorNottifcation}   msg       The message
       * @param   {boolean}             showInOS  Whether to also initiate an OS notification
       */
      error: (msg: ErrorNotification, showInOS: boolean = false) => {
        broadcastIpcMessage('notification-provider', 'error', msg)
        if (this._osSupportsNotification && showInOS) {
          let notification = new Notification({
            title: msg.title,
            body: msg.message,
            silent: false,
            icon: this._icon,
            hasReply: false, // macOS only
            timeoutType: 'default', // Windows/Linux only
            urgency: 'critical', // Linux only
            closeButtonText: '' // macOS only, empty means to use localized text
          })

          // Now show the notification
          notification.show()
        }
      }
    }
  }

  /**
   * Shut down the provider
   *
   * @return  {Promise<boolean>}  Always resolves to true
   */
  async shutdown (): Promise<boolean> {
    global.log.verbose('Notification provider shutting down ...')
    return true
  }
}
