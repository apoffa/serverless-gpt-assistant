import { handlerPath } from "@lib/handlerResolver";
import { disconnectHandler } from "./handler";
export const main = disconnectHandler;

export default {
  handler: `${handlerPath(__dirname)}/index.main`,
  events: [
    {
      websocket: {
        route: "$disconnect",
      },
    },
  ],
};
