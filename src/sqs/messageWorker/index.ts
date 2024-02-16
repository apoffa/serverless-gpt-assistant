import { handlerPath } from "@lib/handlerResolver";
import { receiveMessageHandler } from "./handler";
export const main = receiveMessageHandler;

export default {
  handler: `${handlerPath(__dirname)}/index.main`,
  memorySize: 1024,
  timeout: 200,
  environment: {
    WEBSOCKET_API_ENDPOINT:
      "${cf:serverless-gpt-assistant-" +
      process.env.STAGE +
      ".ServiceEndpointWebsocket}",
  },
};
