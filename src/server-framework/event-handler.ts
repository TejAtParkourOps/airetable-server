import mq from "mqemitter";
import { Server as SocketIoServer } from "socket.io";

const eventMessageQueue = mq({
  separator: ":",
});

type EventMessage<TTopic extends string, TData> = {
  topic: TTopic;
  payload: TData;
};

export type EventMessageHandler<TData> = (
  socketIoServer: SocketIoServer,
  payload: TData
) => void | Promise<void>;
type EventMessageEmitter<TEventMessage extends EventMessage<any, any>> = (
  message: TEventMessage
) => void;

export const eventMessageHandlers: {
  [topic: string]: EventMessageHandler<any>;
} = {};

export function registerEvent<TTopic extends string, TData>(
  topic: TTopic,
  handler: EventMessageHandler<TData>
) {
  eventMessageHandlers[topic] = handler;
  const emitter: EventMessageEmitter<EventMessage<TTopic, TData>> = (message) =>
    eventMessageQueue.emit(message);
  return emitter;
}

export function installEventHandlers(server: SocketIoServer) {
  Object.entries(eventMessageHandlers).forEach(([topic, handler]) => {
    eventMessageQueue.on(topic, async (message, done) => {
      const _message = message as EventMessage<string, unknown>;
      await handler(server, _message.payload);
    });
  });
}
