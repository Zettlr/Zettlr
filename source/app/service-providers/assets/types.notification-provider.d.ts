interface ErrorNotification {
  title: string
  message: string
  additionalInfo: string
}

interface NotificationProvider {
  normal: (message: string, showInOS?: boolean, callback?: Function) => void
  error: (error: ErrorNotification, showInOS?: boolean) => void
}
