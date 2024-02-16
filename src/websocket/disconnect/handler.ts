import {
  APIGatewayProxyWebsocketEventV2,
  APIGatewayProxyWebsocketEventV2WithRequestContext,
} from "aws-lambda";
import { Database } from "@model/Database";

export const disconnectHandler = async (
  event: APIGatewayProxyWebsocketEventV2WithRequestContext<
    APIGatewayProxyWebsocketEventV2["requestContext"] & {
      authorizer: { principalId: string };
    }
  >
): Promise<{ statusCode: number; body: string }> => {
  const db = new Database();
  const userId = event.requestContext.authorizer?.principalId;
  await db.removeConnection(userId);
  return { statusCode: 200, body: "Disconnected." };
};
