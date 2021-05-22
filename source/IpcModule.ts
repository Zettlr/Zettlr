import { ipcRenderer, ipcMain } from 'electron'

// If T is a function returning R, then Promisified<T> is a function with the same arguments returning Promise<R>
// (or simply the function T if R is already a promise)
type Promisified<T extends Function> =
    T extends (...args: infer P) => infer R
      ? (R extends Promise<any>
          ? (...args: P) => R
          : (...args: P) => Promise<R>
        )
      : never

// Replaces all functions of T by functions that return a Promise
type Ipcfied<T> = {
  [K in keyof T]: T[K] extends Function ? Promisified<T[K]> : never;
}

/**
 * Returns an instance of the IPC service T to be used in the renderer.
 *
 * @example
 * interface IpcTestService {
 *   test: (a: string, b: string) => string
 * }
 *
 * let service = IpcModule.forRenderer<IpcTestService>()
 * let result = await service.test('a', 'b')
 */
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

/**
 * Registers an object as an IPC service.
 * @param service the service to register
 *
 * @example
 * interface IpcTestService {
 *   test: (a: string, b: string) => string
 * }
 *
 * IpcModule.registerMain<IpcTestService>({
 *   test: async (a: string, b: string): string => {
 *     // call some internals here and return something
 *     return 'test'
 *   }
 * })

 */
export function registerMain<T> (service: T): void {
  // Get all methods of the service
  const userFunctions = getAllUserFunctions(service)

  // Register all methods of the service with ipc
  for (const methodName of userFunctions) {
    ipcMain.handle(methodName.toString(), (event, args) => {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      global.log.verbose(`[IPC] Calling ${methodName.toString()} with arguments ${args}`)
      let fnc = service[methodName] as unknown as Function
      fnc = fnc.bind(service)
      return fnc(args)
    })
  }
}

// Only elements P of keyof T such that T[P] is a Function
type FunctionOfType<T> = { [P in keyof T]: T[P] extends Function ? P: never }[keyof T]

/**
 * Returns all functions of the given object, except getters and built-in functions like constructors or `__proto__`.
 * @param x the object to get all functions of
 */
function getAllUserFunctions<T> (x: T): Array<FunctionOfType<T>> {
  const isGetter = (obj: T, name: keyof T): boolean => (Object.getOwnPropertyDescriptor(obj, name) ?? {}).get !== undefined
  const isFunction = (obj: T, name: keyof T): boolean => typeof obj[name] === 'function'

  // Get all properties of the object and its prototype hierarchy
  let props: Array<keyof T> = []
  let obj = x
  do {
    props = props.concat(Object.getOwnPropertyNames(obj) as Array<keyof T>)
    obj = Object.getPrototypeOf(obj)
  } while (obj !== null)

  // Reduce to user-defined functions
  const functions = props
    .filter(name => isGetter(x, name) || isFunction(x, name)) // Only functions
    .filter(name => name !== 'constructor' && !name.toString().includes('__')) // Only public functions (and not the constructor)
  // Filter out duplicates
  return Array.from(new Set(functions)) as Array<FunctionOfType<T>>
}
