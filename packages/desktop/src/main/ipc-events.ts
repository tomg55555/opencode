import type { WebContents } from "electron"
import { Effect, Queue, Stream } from "effect"
import type { IpcEvent, IpcEventListener, IpcEventMessage } from "../shared/ipc-rpc"

const queues = new Map<number, Queue.Queue<IpcEventMessage>>()

export function bindIpcEvents(senderId: number) {
  const queue = Effect.runSync(Queue.unbounded<IpcEventMessage>())
  queues.set(senderId, queue)
  return () => {
    if (queues.get(senderId) === queue) queues.delete(senderId)
  }
}

export function ipcEventStream(senderId: number) {
  return Stream.unwrap(
    Effect.gen(function* () {
      const queue = queues.get(senderId) ?? (yield* Queue.unbounded<IpcEventMessage>())
      if (!queues.has(senderId)) queues.set(senderId, queue)
      return Stream.fromQueue(queue)
    }),
  )
}

export function sendIpcEvent<Channel extends keyof IpcEvent>(
  sender: WebContents,
  channel: Channel,
  ...args: Parameters<IpcEventListener<Channel>>
) {
  const queue = queues.get(sender.id)
  if (!queue) return
  Queue.offerUnsafe(queue, { channel, args } as IpcEventMessage)
}
