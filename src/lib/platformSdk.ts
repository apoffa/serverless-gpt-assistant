import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";

export class PlatformSdk {
  constructor() {}

  static async sendMessageToFifoQueue(
    messageBody: string,
    queueUrl: string,
    messageGroupId: string,
    messageDeduplicationId: string
  ) {
    // Crea il comando per inviare il messaggio
    const sqsClient = new SQSClient();
    const sendMessageCommand = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: messageBody,
      MessageGroupId: messageGroupId,
      MessageDeduplicationId: messageDeduplicationId,
    });

    try {
      // Invia il messaggio
      const response = await sqsClient.send(sendMessageCommand);
      console.log("Message sent successfully, MessageId:", response.MessageId);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }

  static async sendApigatewaySocketMessage(
    connectionId: string,
    message: string,
    endpoint: string
  ): Promise<void> {
    // Initialize the API Gateway management client
    const client = new ApiGatewayManagementApiClient({
      apiVersion: "2018-11-29",
      endpoint,
    });

    // Create the command
    const command = new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: message,
    });

    await client.send(command);
    console.log("Message sent successfully");
  }
}
