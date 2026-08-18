import {
  AppDeepLink,
  DraftsGetBlob,
  DraftsPutBlob,
  FilesOpenPath,
  FilesReadClipboardImage,
  FilesReadPickedFile,
  IpcTransportPort,
  MenuCommand,
  UpdaterStateChanges,
  WindowFullscreenChanged,
  WindowPinchZoomEnabledChanged,
  WindowZoomFactorChanged,
  WslEvent,
} from "../shared/ipc-rpc"
import { ipcRenderer } from "electron"
import { Context, Effect, Layer, ManagedRuntime, Queue, Stream } from "effect"
import { RpcClient, RpcMessage, RpcSerialization } from "effect/unstable/rpc"
import {
  type IpcEvent,
  type IpcEventListener,
  type IpcInvoke,
  type IpcInvokeArgs,
  type IpcInvokeResult,
  type IpcSend,
} from "../shared/ipc-rpc"
import { DesktopRpcs, type DesktopRpcClient } from "../shared/ipc-rpc"

class DesktopClient extends Context.Service<DesktopClient, DesktopRpcClient>()("opencode/desktop/DesktopClient") {}

const port = new Promise<MessagePort>((resolve) => {
  ipcRenderer.once(IpcTransportPort, (event) => resolve(event.ports[0]))
})

const ClientProtocolLive = Layer.unwrap(Effect.promise(() => port).pipe(Effect.map((value) => clientProtocol(value))))
const ClientLive = Layer.effect(DesktopClient, RpcClient.make(DesktopRpcs)).pipe(Layer.provide(ClientProtocolLive))
const runtime = ManagedRuntime.make(ClientLive)
const listeners = new Map<keyof IpcEvent, Set<(...args: ReadonlyArray<unknown>) => void>>()
type EventEntry = { readonly channel: keyof IpcEvent; readonly args: ReadonlyArray<unknown> }

runtime.runFork(
  Effect.gen(function* () {
    const client = yield* DesktopClient
    const stream = (
      channel: keyof IpcEvent,
      source: Stream.Stream<ReadonlyArray<unknown>, unknown>,
    ): Stream.Stream<EventEntry, unknown> => source.pipe(Stream.map((args) => ({ channel, args })))
    yield* Stream.mergeAll(
      [
        stream(AppDeepLink._tag, client[AppDeepLink._tag]([])),
        stream(MenuCommand._tag, client[MenuCommand._tag]([])),
        stream(UpdaterStateChanges._tag, client[UpdaterStateChanges._tag]([])),
        stream(WslEvent._tag, client[WslEvent._tag]([])),
        stream(WindowFullscreenChanged._tag, client[WindowFullscreenChanged._tag]([])),
        stream(WindowPinchZoomEnabledChanged._tag, client[WindowPinchZoomEnabledChanged._tag]([])),
        stream(WindowZoomFactorChanged._tag, client[WindowZoomFactorChanged._tag]([])),
      ],
      { concurrency: "unbounded" },
    ).pipe(
      Stream.runForEach((event) =>
        Effect.sync(() => listeners.get(event.channel)?.forEach((listener) => listener(...event.args))),
      ),
    )
  }),
)

export function invoke<Channel extends keyof IpcInvoke>(channel: Channel, ...args: IpcInvokeArgs<Channel>) {
  return call(channel, args).then((result) => fromWire(channel, result) as IpcInvokeResult<Channel>)
}

export function send<Channel extends keyof IpcSend>(channel: Channel, ...args: IpcSend[Channel]) {
  void call(channel, args).catch(() => undefined)
}

export function listen<Channel extends keyof IpcEvent>(channel: Channel, listener: IpcEventListener<Channel>) {
  const callback = listener as unknown as (...args: ReadonlyArray<unknown>) => void
  const callbacks = listeners.get(channel) ?? new Set()
  callbacks.add(callback)
  listeners.set(channel, callbacks)
  return () => {
    callbacks.delete(callback)
    if (callbacks.size === 0) listeners.delete(channel)
  }
}

function call(channel: keyof IpcInvoke | keyof IpcSend, args: ReadonlyArray<unknown>) {
  return runtime.runPromise(
    Effect.gen(function* () {
      const client = yield* DesktopClient
      const method = client[channel] as unknown as (payload: ReadonlyArray<unknown>) => Effect.Effect<unknown, unknown>
      return yield* method(toWire(channel, args))
    }),
  )
}

function toWire(channel: keyof IpcInvoke | keyof IpcSend, args: ReadonlyArray<unknown>) {
  if (channel === DraftsPutBlob._tag) return [new Uint8Array(args[0] as ArrayBuffer)]
  return args
}

function fromWire(channel: keyof IpcInvoke, result: unknown) {
  if (channel === DraftsGetBlob._tag || channel === FilesReadPickedFile._tag) {
    return result instanceof Uint8Array
      ? result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength)
      : result
  }
  if (channel === FilesReadClipboardImage._tag && result && typeof result === "object" && "buffer" in result) {
    const value = result as { buffer: Uint8Array; width: number; height: number }
    return {
      ...value,
      buffer: value.buffer.buffer.slice(value.buffer.byteOffset, value.buffer.byteOffset + value.buffer.byteLength),
    }
  }
  return result === null && channel === FilesOpenPath._tag ? undefined : result
}

function clientProtocol(value: MessagePort) {
  return Layer.effect(
    RpcClient.Protocol,
    RpcClient.Protocol.make(
      Effect.fnUntraced(function* (writeResponse, clientIds) {
        const serialization = yield* RpcSerialization.RpcSerialization
        const parser = serialization.makeUnsafe()
        const inbound = yield* Queue.unbounded<RpcMessage.FromServerEncoded>()
        const onMessage = (event: MessageEvent) => {
          try {
            parser
              .decode(event.data)
              .forEach((message) => Queue.offerUnsafe(inbound, message as RpcMessage.FromServerEncoded))
          } catch {
            return
          }
        }
        value.addEventListener("message", onMessage)
        value.start()
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            value.removeEventListener("message", onMessage)
            value.close()
          }),
        )
        yield* Stream.fromQueue(inbound).pipe(
          Stream.runForEach((message) =>
            Effect.forEach(clientIds, (clientId) => writeResponse(clientId, message), { discard: true }),
          ),
          Effect.forkScoped,
        )
        return {
          send: (_clientId, request) =>
            Effect.sync(() => {
              const encoded = parser.encode(request)
              if (encoded !== undefined) value.postMessage(encoded)
            }),
          supportsAck: true,
          supportsTransferables: false,
        }
      }),
    ),
  ).pipe(Layer.provide(RpcSerialization.layerMsgPack))
}
