interface ErrorNotification {
  title: string
  message: string
  additionalInfo: string
}

interface NotificationProvider {
  normal: (message: string, callback?: Function) => void
  error: (error: ErrorNotification) => void
}
