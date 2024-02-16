import { SQSEvent } from "aws-lambda";
import { OpenAiAssistant, ThreadMessage } from "@model/OpenAIAssistant";
import { PlatformSdk } from "@lib/platformSdk";
import axios from "axios";

export const get_books_inventory = async ({
  userId,
  genre,
}: {
  userId: string;
  genre?: string;
}) => {
  try {
    console.log(
      "Passing user from the system to show how to use system params: %j",
      userId
    );
    const { data: books } = await axios.get(
      `https://simple-books-api.glitch.me/books`
    );
    return genre ? books.filter((book) => book.type === genre) : books;
  } catch (error) {
    console.log("error: %j", error);
    return "null";
  }
};

export const sendSocketResponse = async (
  message: string,
  connectionId: string,
  error: boolean
) => {
  await PlatformSdk.sendApigatewaySocketMessage(
    connectionId,
    JSON.stringify({
      messageType: "assistantResponse",
      error,
      message,
    }),
    process.env.WEBSOCKET_API_ENDPOINT.replace("wss://", "https://")
  );
};

export const main = async (event: SQSEvent) => {
  const message = JSON.parse(event.Records[0].body) as ThreadMessage;
  const userId = message.userId;
  const assistantId = process.env.ASSISTANT_ID;
  const threadId = message.threadId;
  const assistant = new OpenAiAssistant(
    assistantId,
    process.env.OPEN_AI_API_KEY,
    "gpt-4-1106-preview",
    userId,
    parseInt(process.env.RESPONSE_TIMEOUT_IN_SECONDS),
    {
      get_books_inventory: {
        function: get_books_inventory,
        params: { userId },
      },
    }
  );
  assistant.setThreadId(threadId);
  const success = await assistant.postMessage(message.message);
  if (!success) {
    await sendSocketResponse("Error elaborating message", userId, true);
    return;
  }
  const response = await assistant.getAssistantResponse();
  await sendSocketResponse(response, userId, false);
};
export const receiveMessageHandler = async (event: SQSEvent) => {
  try {
    await main(event);
  } catch (error) {
    console.log("Error elaborating message: %j", error);
  }
};
