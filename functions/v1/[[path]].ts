import { handleBoardRequest, type BoardEnv } from "../../server/board.ts";

export function onRequest(context: { request: Request; env: BoardEnv }) {
  return handleBoardRequest(context.request, context.env);
}
