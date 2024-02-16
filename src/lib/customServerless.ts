import type { AWS } from "@serverless/typescript";

export interface CustomAWS extends AWS {
  constructs: Constructs;
}

export interface Constructs {
  [key: string]: FIFOQueue;
}

export interface FIFOQueue {
  type: string;
  fifo: boolean;
  alarm: string;
  maxRetries: number;
  batchSize: number;
  worker: AWS["functions"][string];
}

export interface Worker {
  handler: string;
}
