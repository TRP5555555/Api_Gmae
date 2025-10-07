import "express-session";
import type { User } from "../controller/gameApi";

declare module "express-session" {
  interface SessionData {
    user?: User;
  }
}
