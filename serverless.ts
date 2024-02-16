import { CustomAWS } from "@lib/customServerless";
import { buildEnv, environmentRegions } from "@deploy/buildEnv";
const { stage } = buildEnv();

// Websocket endpoints
import authorizer from "src/websocket/authorizer";
import connect from "src/websocket/connect";
import disconnect from "src/websocket/disconnect";
import receiveMessageHandler from "src/websocket/receiveMessage";

// SQS Worker
import messageWorker from "src/sqs/messageWorker";

const serverlessConfiguration: CustomAWS = {
  service: "serverless-gpt-assistant",
  frameworkVersion: "3",
  plugins: [
    "serverless-esbuild",
    "serverless-plugin-log-retention",
    "serverless-lift",
  ],
  provider: {
    apiName: `serverless-gpt-assistant`,
    name: "aws",
    runtime: "nodejs18.x",
    profile: process.env.LOCAL_AWS_PROFILE,
    stage: stage,
    region: environmentRegions[stage] || environmentRegions["dev"],
    websocketsApiName: "my-websockets-api",
    websocketsApiRouteSelectionExpression: "$request.body.action",
    websocketsDescription: "My websocket chat assistant",
    iam: {
      role: {
        managedPolicies: [
          "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess",
          "arn:aws:iam::aws:policy/AmazonAPIGatewayInvokeFullAccess",
          "arn:aws:iam::aws:policy/AmazonSQSFullAccess",
        ],
      },
    },
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      NODE_OPTIONS: "--enable-source-maps --stack-trace-limit=1000",
      STAGE: process.env.STAGE || "",
      RESPONSE_TIMEOUT_IN_SECONDS: process.env.RESPONSE_TIMEOUT_IN_SECONDS,
      LOCAL_AWS_PROFILE: process.env.LOCAL_AWS_PROFILE,
      OPEN_AI_API_KEY: process.env.OPEN_AI_API_KEY,
      ASSISTANT_ID: process.env.ASSISTANT_ID,
      ASSISTANT_VERSION: process.env.ASSISTANT_VERSION,
      SQS_DLQ_ALARM_CONTACT: process.env.SQS_DLQ_ALARM_CONTACT,
      CONNECTION_TABLE_NAME: process.env.CONNECTION_TABLE_NAME,
      COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
    },
  },
  functions: {
    //Websocket
    authorizer,
    connect,
    disconnect,
    receiveMessageHandler,
  },
  package: { individually: true },
  custom: {
    stage: stage,
    logRetentionInDays: 30,
    region: environmentRegions,
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ["aws-sdk"],
      target: "node18",
      define: { "require.resolve": undefined },
      platform: "node",
      concurrency: 10,
    },
  },
  constructs: {
    threadManager: {
      type: "queue",
      fifo: true,
      alarm: process.env.SQS_DLQ_ALARM_CONTACT,
      maxRetries: 1,
      batchSize: 1,
      worker: messageWorker,
    },
  },
};

module.exports = serverlessConfiguration;
