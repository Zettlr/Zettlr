export function debounce<T extends (...args: any[]) => void>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null
    return function (this: any, ...args: any[]) {
      if (timeout !== null) clearTimeout(timeout)
      timeout = setTimeout(() => func.apply(this, args), wait)
    }
  }
  
  export default debounce
  