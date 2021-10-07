import { Evt, EvtOf, MsgOf } from "./types";

/**
 * Stores persist event messages into streams correlated by aggregate id
 * - produces committed events
 */
export interface Store {
  /**
   * Store initializer
   */
  init: () => Promise<void>;

  /**
   * Store closer
   */
  close: () => Promise<void>;

  /**
   * Loads the last event for the stream. Used for loading snapshots
   * @param stream stream name
   */
  getLastEvent: (stream:string)=> Promise<Evt>

  /**
   * Loads aggregate in memory by reading stream and reducing model
   * @param stream stream name
   * @param reducer model reducer
   */
  load <E>( stream: string, reducer: (event: EvtOf<E>) => void ): Promise<void>;
  load <E>( stream: string, afterEvent: number, reducer: (event: EvtOf<E>) => void ): Promise<void>;

  /**
   * Commits message into stream of aggregate id
   * @param stream stream name
   * @param events array of uncommitted events
   * @param expectedVersion optional aggregate expected version to provide optimistic concurrency, raises concurrency exception when not matched
   * @returns array of committed events
   */
  commit: <E>(
    stream: string,
    events: MsgOf<E>[],
    expectedVersion?: string
  ) => Promise<EvtOf<E>[]>;

  /**
   * Loads events from stream
   * @param name optional event name filter
   * @param after optional starting point - defaults to -1
   * @param limit optional max number of events to return - defaults to 1
   * @returns events array
   */
  read: (name?: string, after?: number, limit?: number) => Promise<Evt[]>;
}
