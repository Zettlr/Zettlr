import { ipcRenderer, ipcMain } from 'electron'

type Promisified<T extends Function> = 
    T extends (...args: infer P) => infer R
      ? ( R extends Promise<any> 
          ? (...args: P) => R
          : (...args: P) => Promise<R>
        )
      : never
    ;

type Ipcfied<D> = {
  [K in keyof D]: D[K] extends Function ? Promisified<D[K]> : never;
}

export abstract class IpcModule {
  public static forRenderer<T>(): Ipcfied<T> {
    return new Proxy({}, {
      get (target: any, prop: PropertyKey, receiver: any): any {
        const methodName = prop.toString();
        return async function(...args: any[]) {
          return ipcRenderer.invoke(methodName, args);
        }
      }
    });
  }

  public static registerMain<T>(service: T) {
    // Get all methods of the service
    const userFunctions = IpcModule.getAllUserFunctions(service)

    // Register all methods of the service with ipc
    for (const methodName of userFunctions) {
      ipcMain.handle(methodName, async (event, someArgument) => {
        return await service[methodName](someArgument)
      })
    }
  }

  private static getAllUserFunctions(x: any) {
    const isGetter = ( x, name:string ) => ( Object.getOwnPropertyDescriptor(x, name) || {} ).get
    const isFunction = ( x, name:string ) => typeof x[name] === "function";

    // Recursively, get all properties of the object (and its prototype hierarchy)
    var props: string[] = [];
    var obj = x;
    do {
      props = props.concat(Object.getOwnPropertyNames(obj));
    } while (obj = Object.getPrototypeOf(obj));

    // Reduce to user-defined functions
    const functions = props
      .filter(name => isGetter(x, name) || isFunction(x, name)) // Only functions
      .filter(name => name !== "constructor" && !~name.indexOf( "__" )) // Only public functions (and not the constructor)
    return Array.from(new Set(functions))
  }
}
