import { handlerPath } from "@lib/handlerResolver";
import { authorizer } from "./handler";
export const main = authorizer;

export default {
  handler: `${handlerPath(__dirname)}/index.main`,
  environment: {
    COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
  },
};
