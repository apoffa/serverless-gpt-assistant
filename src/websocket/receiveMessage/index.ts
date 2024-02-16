import { handlerPath } from "@lib/handlerResolver";
import { receiveMessageHandler } from "./handler";
export const main = receiveMessageHandler;

export default {
  handler: `${handlerPath(__dirname)}/index.main`,
  environment: {
    QUEUE_URL: "${construct:threadManager.queueUrl}",
  },
  events: [
    {
      websocket: {
        route: "sendMessage",
      },
    },
  ],
};
