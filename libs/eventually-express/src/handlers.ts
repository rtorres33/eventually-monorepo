import {
  Actor,
  app,
  bind,
  CommandAdapterFactory,
  CommittedEvent,
  EventHandlerFactory,
  Errors,
  log,
  State,
  Reducer,
  ReducibleFactory,
  SnapshotStore,
  store,
  AllQuery,
  SnapshotsQuery,
  Snapshot
} from "@rotorsoft/eventually";
import { NextFunction, Request, Response } from "express";

export const statsHandler = async (
  _: Request,
  res: Response,
  next: NextFunction
): Promise<Response | undefined> => {
  try {
    const stats = await store().stats();
    return res.status(200).send(stats);
  } catch (error) {
    next(error);
  }
};

export const allStreamHandler = async (
  req: Request<any, CommittedEvent[], any, AllQuery>,
  res: Response,
  next: NextFunction
): Promise<Response | undefined> => {
  try {
    const {
      stream,
      names,
      before,
      after = -1,
      limit = 1,
      created_before,
      created_after,
      correlation,
      backward
    } = req.query;
    const result = await app().query({
      stream,
      names: names && (Array.isArray(names) ? names : [names]),
      after: after && +after,
      before: before && +before,
      limit: limit && +limit,
      created_after: created_after && new Date(created_after),
      created_before: created_before && new Date(created_before),
      correlation,
      backward
    });
    return res.status(200).send(result);
  } catch (error) {
    next(error);
  }
};

export const getHandler =
  (factory: ReducibleFactory, callback: Reducer) =>
  async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<Response | undefined> => {
    try {
      const { id } = req.params;
      const result = await callback(
        factory,
        id,
        ["true", "1"].includes(req.query.useSnapshots as string)
      );
      let etag: string | undefined;
      if (Array.isArray(result)) {
        etag = result.at(-1)?.event?.version?.toString();
      } else if (result.event) {
        etag = result.event.version.toString();
      }
      etag && res.setHeader("ETag", etag);
      return res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

export const snapshotQueryHandler =
  (store: SnapshotStore) =>
  async (
    req: Request<any, Snapshot, any, SnapshotsQuery>,
    res: Response,
    next: NextFunction
  ): Promise<Response | undefined> => {
    try {
      const { limit = 10 } = req.query;
      const result = await store.query({
        limit
      });
      return res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

export const commandHandler =
  (name: string, withEtag: boolean) =>
  async (
    req: Request<{ id: string }, any, State, never> & {
      actor?: Actor;
    },
    res: Response,
    next: NextFunction
  ): Promise<Response | undefined> => {
    try {
      const ifMatch = req.headers["if-match"] || undefined;
      const snapshots = await app().command(
        bind(
          name,
          req.body,
          req.params.id,
          withEtag && ifMatch ? +ifMatch : undefined,
          req.actor
        )
      );
      const etag = snapshots.at(-1)?.event?.version;
      etag && res.setHeader("ETag", etag);
      return res.status(200).send(snapshots);
    } catch (error) {
      next(error);
    }
  };

export const invokeHandler =
  (factory: CommandAdapterFactory) =>
  async (
    req: Request<never, any, State, never> & {
      actor?: Actor;
    },
    res: Response,
    next: NextFunction
  ): Promise<Response | undefined> => {
    try {
      const snapshots = await app().invoke(factory, req.body);
      const etag = snapshots.at(-1)?.event?.version;
      etag && res.setHeader("ETag", etag);
      return res.status(200).send(snapshots);
    } catch (error) {
      next(error);
    }
  };

export const eventHandler =
  (factory: EventHandlerFactory) =>
  async (
    req: Request<never, any, CommittedEvent>,
    res: Response,
    next: NextFunction
  ): Promise<Response | undefined> => {
    try {
      const response = await app().event(factory, req.body);
      return res.status(200).send(response);
    } catch (error) {
      next(error);
    }
  };

export const errorHandler = (
  error: Error,
  _: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  __: NextFunction
): Response => {
  log().error(error);
  // eslint-disable-next-line
  const { name, message, stack, ...other } = error;
  switch (name) {
    case Errors.ValidationError:
      return res.status(400).send({ name, message, ...other });
    case Errors.RegistrationError:
      return res.status(404).send({ name, message, ...other });
    case Errors.ConcurrencyError:
      return res.status(409).send({ name, message, ...other });
    default:
      return res.status(500).send({ name, message });
  }
};
