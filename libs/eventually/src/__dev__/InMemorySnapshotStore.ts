import { log } from "../ports";
import { SnapshotStore } from "../interfaces";

export const InMemorySnapshotStore = (): SnapshotStore => {
  let _store: Record<string, any> = {};

  return {
    name: "InMemoryStore",
    dispose: () => {
      _store = {};
      return Promise.resolve();
    },

    seed: () => Promise.resolve(),

    read: (stream) => {
      _store[stream] &&
        log().trace("white", `Snapshot loaded for stream ${stream}`);
      return Promise.resolve(_store[stream]);
    },

    upsert: (stream, data) => {
      _store[stream] = data;
      log().trace("white", `Snapshot created for stream ${stream}`);
      return Promise.resolve();
    },

    query: (query) => {
      return Promise.resolve(Object.values(_store).slice(0, query.limit));
    }
  };
};
