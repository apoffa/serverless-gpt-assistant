import {
  DynamoDBClient,
  PutItemCommandInput,
  PutItemCommand,
  QueryCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { DateTime } from "luxon";

export class Database {
  tableName: string;
  client: DynamoDBClient;

  constructor() {
    this.tableName = process.env.CONNECTION_TABLE_NAME;
    this.client = new DynamoDBClient({ region: process.env.AWS_REGION });
  }

  async getUserConnection(userId: string): Promise<SocketConnection | null> {
    const { Items } = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "#pk = :pk and begins_with(#sk, :sk)",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
        },
        ExpressionAttributeValues: marshall({
          ":pk": `user#${userId}`,
          ":sk": "connection",
        }),
        Limit: 1,
      })
    );
    if (Items && Items.length > 0) {
      const item = unmarshall(Items[0]) as SocketConnection;
      return item;
    }
    return null;
  }

  async getUserConnectionId(userId: string) {
    const connection = await this.getUserConnection(userId);
    if (connection) {
      return connection.connectionId;
    }
    return null;
  }

  async createConnection(
    userId: string,
    connectionId: string,
    threadId: string
  ) {
    const now = DateTime.utc().toISO();
    const connection: SocketConnection = {
      pk: `user#${userId}`,
      sk: `connection`,
      connectionId,
      userId,
      threadId,
      createdAt: now,
      updatedAt: now,
    };
    const input: PutItemCommandInput = {
      TableName: this.tableName,
      Item: marshall(connection),
    };
    await this.client.send(new PutItemCommand(input));
    return connection;
  }

  async removeConnection(userId: string) {
    await this.client.send(
      new DeleteItemCommand({
        TableName: this.tableName,
        Key: marshall({
          pk: `user#${userId}`,
          sk: `connection`,
        }),
      })
    );
  }

  async getUserIdFromConnection(connectionId: string) {
    const { Items } = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "connectionIdIndex",
        KeyConditionExpression: "#sk = :sk",
        ExpressionAttributeNames: {
          "#sk": "connectionId",
        },
        ExpressionAttributeValues: marshall({
          ":sk": connectionId,
        }),
        Limit: 1,
      })
    );
    if (Items && Items.length > 0) {
      const item = unmarshall(Items[0]) as SocketConnection;
      return item.userId;
    }
    return null;
  }
}

interface ConnectionKey {
  pk: `user#${string}`;
  sk: `connection`;
}
interface SocketConnection extends ConnectionKey {
  connectionId: string;
  userId: string;
  threadId: string;
  createdAt: string;
  updatedAt: string;
}
