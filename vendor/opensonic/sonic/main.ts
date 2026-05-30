
import { engine_init } from "./core/engine"

// Level is selectable via ?level= so the host app (iframe) can boot a specific
// zone. Defaults to Blue Ocean. The tutoring integration will pass a custom
// level here and drive events over postMessage.
const params = new URLSearchParams(typeof location !== "undefined" ? location.search : "");
const level = params.get("level") || "data/levels/blue_ocean_1.json";

engine_init({ level });