import { Disposable } from "../interfaces";
import { invoke, command, event, load, query } from "../handlers";
import { bind } from "../utils";
import {
  AllQuery,
  Client,
  CommandHandlerFactory,
  CommandTarget,
  CommittedEvent,
  Messages,
  Snapshot,
  State
} from "../types";

export const InMemoryClient = (): Client & Disposable => ({
  name: "InMemoryClient",
  dispose: () => Promise.resolve(),
  invoke,
  command: <S extends State, C extends Messages, E extends Messages>(
    factory: CommandHandlerFactory<S, C, E>,
    name: keyof C & string,
    data: Readonly<C[keyof C & string]>,
    target?: CommandTarget
  ): Promise<Snapshot<S, E>[]> => command(bind(name, data, target)),
  event,
  load,
  query: async (
    allQuery: AllQuery,
    callback?: (event: CommittedEvent) => void
  ): Promise<{
    first?: CommittedEvent;
    last?: CommittedEvent;
    count: number;
  }> => {
    let first: CommittedEvent | undefined = undefined,
      last: CommittedEvent | undefined = undefined;
    const count = await query(allQuery, (e) => {
      !first && (first = e);
      last = e;
      callback && callback(e);
    });
    return { first, last, count };
  }
});
