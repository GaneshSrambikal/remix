import type * as express from "express";
import type { ReactServerBuild } from "@remix-run/server-runtime";
import { createRSCRequestHandler as createRemixRSCRequestHandler } from "@remix-run/server-runtime/dist/react-server";

import { createRemixRequest, sendRemixResponse } from "./server";
import type { GetLoadContextFunction } from "./server";

export type RSCRequestHandler = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => Promise<void>;

export function createRSCRequestHandler({
  build,
  getLoadContext,
  mode,
}: {
  build: ReactServerBuild | (() => Promise<ReactServerBuild>);
  getLoadContext?: GetLoadContextFunction;
  mode?: string;
}): RSCRequestHandler {
  let handler = createRemixRSCRequestHandler(build, mode);
  return async (req, res, next) => {
    try {
      let loadContext = getLoadContext
        ? await getLoadContext(req, res)
        : undefined;
      let request = createRemixRequest(req, res);
      let response = await handler(request, loadContext);
      await sendRemixResponse(res, response);
    } catch (error) {
      next(error);
    }
  };
}