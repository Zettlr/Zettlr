import { TagProviderProtocol } from '@providers/tag-provider'
import { IpcMainInvokeEvent, ipcMain as electronIpcMain } from 'electron'

/**
 * Defines all channels of the Ipc, and which commands are supported on this channel.
 */
interface IpcProtocol {
  tagProvider: TagProviderProtocol
}

/**
 * Union of all names of functions defined in the given type.
 */
type FunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? K : never;
}[keyof T]

/**
 * All functions defined in the given type.
 */
type FunctionProperties<T> = Pick<T, FunctionPropertyNames<T>>

/**
 * Converts a union type to an intersection type.
 */
type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (x: infer R) => any ? R : never

/**
 * If T is a function returning R, then Promisified<T> is a function with the same arguments returning Promise<R>
 * (or simply the function T if R is already a promise).
 */
type Promisified<T extends Function> =
 T extends (...args: infer P) => infer R
   ? (R extends Promise<any>
       ? (...args: P) => R
       : (...args: P) => Promise<R>
     )
   : never

/**
* Replaces all functions of T by functions that return a Promise.
*/
type PromisfiedAll<T> = {
  [K in keyof T]: T[K] extends Function ? Promisified<T[K]> : never;
}

/**
 * Replaces all functions in all channels by functions that return a Promise.
 */
export type PromisfiedProtocol = {
  [K in keyof IpcProtocol]: PromisfiedAll<IpcProtocol[K]>
}

/**
 * The name of the channel.
 */
type IpcChannel = keyof IpcProtocol

/**
 * The protocol (i.e. all possible commands) of the given channel.
 */
type ProtocolType<Channel extends IpcChannel> = FunctionProperties<IpcProtocol[Channel]>

/**
 * Union of all names of functions defined in the given channel.
 */
type MessageNameType<Channel extends IpcChannel> = keyof ProtocolType<Channel>

/**
 * The function of the given message (in the given channel).
 */
type MessageFunctionType<Channel extends IpcChannel, Message extends MessageNameType<Channel>> = ProtocolType<Channel>[Message]

/**
 * The parameters of the given message (in the given channel).
 */
type MessageParamsType<Channel extends IpcChannel, Message extends MessageNameType<Channel>> = MessageFunctionType<Channel, Message> extends (args: infer P) => any ? P : never

/**
 * The return type of the given message (in the given channel).
 */
type MessageReturnType<Channel extends IpcChannel, Message extends MessageNameType<Channel>> = MessageFunctionType<Channel, Message> extends (...args: any) => infer R ? R : never

/**
 * The message passed around on the Ipc.
 */
interface IpcMessage<Channel extends IpcChannel, Message extends MessageNameType<Channel>> {
  command: Message
  payload: MessageParamsType<Channel, Message>
}

/**
 * The listener reacting to the Ipc message.
 *
 * In principle it should also work without the any return type at the end, in which case the GetListenerType type below would be treated as a function overload.
 * However I couldn't find a way to convert an intersection of functions to a proper function overload.
 */
type IpcListener<Channel extends IpcChannel, Message extends MessageNameType<Channel>> = (event: IpcMainInvokeEvent, message: IpcMessage<Channel, Message>) => MessageReturnType<Channel, Message> | any

/**
 * Wraps the given message (as string) as a listener function reacting only to exactly this message.
 */
type ToListener<Channel extends IpcChannel, Message> = Message extends MessageNameType<Channel> ? IpcListener<Channel, Message> : never

/**
 * The listener reacting to possibly all messages in the given channel.
 */
type ListenerType<Channel extends IpcChannel> = UnionToIntersection<ToListener<Channel, MessageNameType<Channel>>>

class IpcMain {
  handle<Channel extends IpcChannel> (
    channel: Channel,
    listener: ListenerType<Channel>
  ): void {
    // @ts-expect-error: we know that the listener is a function
    electronIpcMain.handle(channel, listener)
  }
}
export const ipcMain = new IpcMain()
