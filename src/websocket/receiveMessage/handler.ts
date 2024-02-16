import {
  APIGatewayProxyWebsocketEventV2,
  APIGatewayProxyWebsocketEventV2WithRequestContext,
} from "aws-lambda";
import { BodyType } from "./type";
import { successResponse, errorResponse } from "@lib/apiGateway";
import { PlatformSdk } from "@lib/platformSdk";
import { ThreadMessage } from "@model/OpenAIAssistant";
import { Database } from "@model/Database";

export const receiveMessageHandler = async (
  event: APIGatewayProxyWebsocketEventV2WithRequestContext<
    APIGatewayProxyWebsocketEventV2["requestContext"] & {
      authorizer: { principalId: string };
    }
  >
): Promise<{ statusCode: number; body: string }> => {
  console.log("event: %j", event);
  try {
    const { message }: BodyType = JSON.parse(event.body);
    const userId = event.requestContext.authorizer?.principalId;
    const db = new Database();
    const connection = await db.getUserConnection(userId);
    const threadMessage: ThreadMessage = {
      message,
      messageId: event.requestContext.requestId,
      userId,
      threadId: connection.threadId,
    };
    await PlatformSdk.sendMessageToFifoQueue(
      JSON.stringify(threadMessage),
      process.env.QUEUE_URL,
      userId,
      threadMessage.messageId
    );
    return successResponse({ message: "message received." });
  } catch (e) {
    console.log("error: %j", e);
    return errorResponse({ message: e.cause || e.message }, 500);
  }
};
