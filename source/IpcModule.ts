import { ipcRenderer, ipcMain } from 'electron'

type Promisified<T extends Function> =
    T extends (...args: infer P) => infer R
      ? (R extends Promise<any>
          ? (...args: P) => R
          : (...args: P) => Promise<R>
        )
      : never

type Ipcfied<D> = {
  [K in keyof D]: D[K] extends Function ? Promisified<D[K]> : never;
}

export function forRenderer<T> (): Ipcfied<T> {
  return new Proxy({}, {
    get (target: any, prop: PropertyKey, receiver: any): any {
      const methodName = prop.toString()
      return async function (...args: any[]) {
        return await ipcRenderer.invoke(methodName, args)
      }
    }
  })
}

export function registerMain<T> (service: T): void {
  // Get all methods of the service
  const userFunctions = getAllUserFunctions(service)

  // Register all methods of the service with ipc
  for (const methodName of userFunctions) {
    ipcMain.handle(methodName, async (event, someArgument) => {
      return await service[methodName](someArgument)
    })
  }
}

function getAllUserFunctions (x: any) {
  const isGetter = (obj: any, name: string) => (Object.getOwnPropertyDescriptor(obj, name) || {}).get
  const isFunction = (obj: any, name: string) => typeof obj[name] === "function"

  // Recursively, get all properties of the object (and its prototype hierarchy)
  var props: string[] = []
  var obj = x
  do {
    props = props.concat(Object.getOwnPropertyNames(obj))
  } while (obj = Object.getPrototypeOf(obj))

  // Reduce to user-defined functions
  const functions = props
    .filter(name => isGetter(x, name) || isFunction(x, name)) // Only functions
    .filter(name => name !== "constructor" && !~name.indexOf("__")) // Only public functions (and not the constructor)
  return Array.from(new Set(functions))
}
