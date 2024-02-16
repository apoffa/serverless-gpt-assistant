import { handlerPath } from "@lib/handlerResolver";
import { connectHandler } from "./handler";
export const main = connectHandler;

export default {
  handler: `${handlerPath(__dirname)}/index.main`,
  events: [
    {
      websocket: {
        route: "$connect",
        authorizer: {
          name: "authorizer",
          identitySource: ["route.request.querystring.Auth"],
        },
      },
    },
  ],
};
