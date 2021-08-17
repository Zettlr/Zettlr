interface ErrorNotification {
  title: string
  message: string
  additionalInfo: string
}

interface NotificationProvider {
  normal: (message: string, callback?: Function) => boolean
  error: (error: ErrorNotification) => boolean
}
