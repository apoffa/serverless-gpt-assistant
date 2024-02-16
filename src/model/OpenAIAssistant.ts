import OpenAi from "openai";
type AsyncFunction = (() => Promise<any>) | ((...args: any[]) => Promise<any>);
type AsyncFunctionDefinition = {
  [key: string]: {
    function: AsyncFunction;
    params: any;
  };
};
export class OpenAiAssistant {
  assistantId: string;
  model: string;
  threadId: string;
  openAi: OpenAi;
  runId: string;
  userId: string;
  responseTimeout: number;
  asyncFunctions: AsyncFunctionDefinition;

  constructor(
    assistantId: string,
    openAiKey: string,
    model: string,
    userId: string,
    responseTimeout: number,
    asyncFunctions?: AsyncFunctionDefinition
  ) {
    this.assistantId = assistantId;
    this.model = model;
    this.openAi = new OpenAi({
      apiKey: openAiKey,
    });
    this.userId = userId;
    this.responseTimeout = responseTimeout;
    if (asyncFunctions) this.asyncFunctions = asyncFunctions;
  }

  setThreadId(threadId: string) {
    this.threadId = threadId;
  }

  async createThread() {
    const thread = await this.openAi.beta.threads.create();
    this.setThreadId(thread.id);
    return thread.id;
  }

  private async createRun() {
    if (!this.threadId) {
      throw new Error("Thread id is not set");
    }
    const run = await this.openAi.beta.threads.runs.create(this.threadId, {
      assistant_id: this.assistantId,
      model: this.model,
    });
    this.runId = run.id;
    return run.id;
  }

  async checkRunStatus(runId: string) {
    if (!this.threadId) {
      throw new Error("Thread id is not set");
    }
    const runStatus = await this.openAi.beta.threads.runs.retrieve(
      this.threadId,
      runId
    );
    return runStatus;
  }

  async postMessage(message: string) {
    await this.openAi.beta.threads.messages.create(this.threadId, {
      role: "user",
      content: message,
    });
    await this.createRun();
    let successStatus: boolean = false;
    try {
      let waitForAction: boolean = false;
      let delayTime = 800; // Initial delay time in milliseconds
      const maxDelayTime = 10000; // Maximum delay time (for example, 10 seconds)
      const startTime = Date.now();
      do {
        console.log("waiting for.. ", delayTime);
        await this.sleep(delayTime);

        const elapsedTime = (Date.now() - startTime) / 1000; // Calculate elapsed time in seconds
        if (elapsedTime > this.responseTimeout) {
          // if timeout is exceeded, cancel the run and exit
          console.log("exceeded max timeout of", this.responseTimeout);
          await this.openAi.beta.threads.runs.cancel(this.threadId, this.runId);
          successStatus = false;
          break;
        }

        const runStatus = await this.checkRunStatus(this.runId);
        const { shouldExit, success } = await this.manageRunStatus(runStatus);
        waitForAction = !shouldExit;
        successStatus = success;

        if (!waitForAction) {
          break;
        }
        // Exponential backoff logic
        delayTime = Math.min(delayTime * 1.5, maxDelayTime); // Increment the delay time but cap it at maxDelayTime
        // Add random jitter
        const jitter = delayTime * 0.1 * Math.random(); // 10% of the delay time as jitter
        delayTime += jitter;
      } while (waitForAction);
    } catch (error) {
      console.log("run error:", error);
      await this.openAi.beta.threads.runs.cancel(this.threadId, this.runId);
    }
    return successStatus;
  }

  async sleep(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async manageRunStatus(runStatus: OpenAi.Beta.Threads.Runs.Run) {
    console.log("runStatus:", runStatus.status);
    switch (runStatus.status) {
      case "requires_action":
        const requiredActions =
          runStatus.required_action!.submit_tool_outputs.tool_calls;
        await this.manageRequiredActions(requiredActions);
        return { shouldExit: false, success: false, message: "" };
      case "completed":
        return { shouldExit: true, success: true, message: "" };
      case "in_progress":
        return { shouldExit: false, success: false, message: "" };
      case "failed":
      case "cancelled":
      case "expired":
        return {
          shouldExit: true,
          success: false,
          message: runStatus.last_error?.message,
        };
      default:
        throw new Error(`Unknown run status: ${runStatus.status}`);
    }
  }

  async getAssistantResponse() {
    const responseMessages = await this.openAi.beta.threads.messages.list(
      this.threadId,
      {
        limit: 1,
      }
    );
    const messages = responseMessages.data.map((m) =>
      m.content[0].type === "text" ? m.content[0].text.value : ""
    );
    return messages[0];
  }

  async manageRequiredActions(
    requiredActions: OpenAi.Beta.Threads.Runs.RequiredActionFunctionToolCall[]
  ) {
    let toolsOutput: {
      tool_call_id: string;
      output: string;
    }[] = [];
    for (const action of requiredActions) {
      const funcName = action.function.name;
      console.log("calling function", funcName);
      const funcArgs = JSON.parse(action.function.arguments);
      const sysargs = this.asyncFunctions[funcName].params;
      if (funcArgs) {
        for (const key in funcArgs) {
          sysargs[key] = funcArgs[key];
        }
      }
      const result = await this.asyncFunctions[funcName].function(sysargs);
      toolsOutput.push({
        tool_call_id: action.id,
        output: JSON.stringify(result),
      });
    }
    await this.openAi.beta.threads.runs.submitToolOutputs(
      this.threadId,
      this.runId,
      {
        tool_outputs: toolsOutput,
      }
    );
  }
}

export interface ThreadMessage {
  message: string;
  messageId: string;
  userId: string;
  threadId: string;
}
