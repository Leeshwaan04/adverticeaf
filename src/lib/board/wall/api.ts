import { BOARD_API_BASE, BOARD_MODE } from "../config";
import { createDemoWallApi } from "./demo";
import { createHttpWallApi } from "./http";
import type { WallApi } from "./types";

/** The one Wall API the UI talks to. "live" uses the HTTP client, everything else uses the in-browser demo. */
export const api: WallApi = BOARD_MODE === "live" ? createHttpWallApi(BOARD_API_BASE) : createDemoWallApi();

export type { WallApi } from "./types";
