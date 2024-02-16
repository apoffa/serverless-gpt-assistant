import {
  APIGatewayProxyWebsocketEventV2,
  APIGatewayProxyWebsocketEventV2WithRequestContext,
} from "aws-lambda";
import { Database } from "@model/Database";
import { OpenAiAssistant } from "@model/OpenAIAssistant";

const createThread = async (assistantId: string, userId: string) => {
  const assistant = new OpenAiAssistant(
    assistantId,
    process.env.OPEN_AI_API_KEY,
    "gpt-4-1106-preview",
    userId,
    parseInt(process.env.RESPONSE_TIMEOUT_IN_SECONDS)
  );

  const threadId = await assistant.createThread();
  return threadId;
};

export const connectHandler = async (
  event: APIGatewayProxyWebsocketEventV2WithRequestContext<
    APIGatewayProxyWebsocketEventV2["requestContext"] & {
      authorizer: { principalId: string };
    }
  >
): Promise<{ statusCode: number; body: string }> => {
  console.log("event: %j", event);
  const userId = event.requestContext.authorizer?.principalId;
  const connectionId = event.requestContext.connectionId;
  const db = new Database();
  const threadId = await createThread(process.env.ASSISTANT_ID, userId);
  await db.createConnection(userId, connectionId, threadId);
  return { statusCode: 200, body: "Connected." };
};
