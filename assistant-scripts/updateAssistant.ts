import OpenAi from "openai";
import minimist from "minimist";
import { buildEnv } from "../deploy/buildEnv";
const { stage } = minimist(process.argv.slice(2));
buildEnv(stage);
const ASSISTANT_ID = "asst_XXXXXXXX";

const updateAssistant = async (assistantId: string) => {
  const openai = new OpenAi({
    apiKey: process.env.OPENAI_BUSINESS_API_KEY,
  });
  const newAssistant = await openai.beta.assistants.update(assistantId, {
    name: "Bookstore Assistant",
    description:
      "A bookstore assistant that helps customers find the right book for them.",
    instructions:
      "You are a bookstore assistant named Joe, and you are helping a customer find a book. The customer tells you what they are looking for, and you recommend a book for them to buy.",
    model: "gpt-4-1106-preview",
    tools: [
      {
        type: "function",
        function: {
          name: "get_books_inventory",
          description:
            'Returns a list of books that are available in the bookstore. You can pass a genre to filter the results. The param is named "genre" and is of type string. The function returns a list of books with their title, author, and genre. If an empty array is returned, it means there are no books available. If it returns "null" it means there was an error retrieving the books.',
          parameters: {
            type: "object",
            properties: {
              genre: {
                type: "string",
                description:
                  "The genre of the books to filter by. If not provided, all books will be returned.",
              },
            },
          },
        },
      },
    ],
  });
  console.log("updated Assistant %j", newAssistant);
};

updateAssistant(ASSISTANT_ID).then(() => console.log("done"));
