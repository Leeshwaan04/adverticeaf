import { BOARD_MODE } from "@/lib/board/config";
import { demoApi } from "./demo";
import { httpApi } from "./http";
import type { ThroneApi } from "./types";

/** The one Throne API the UI talks to. Picked by NEXT_PUBLIC_BOARD_MODE at build time. */
export const api: ThroneApi = BOARD_MODE === "live" ? httpApi : demoApi;
