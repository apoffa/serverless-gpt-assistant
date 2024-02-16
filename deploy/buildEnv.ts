import minimist from "minimist";
import * as dotenv from "dotenv";
import path from "path";

export const buildEnv = (stage = null) => {
  if (!stage) {
    const { stage } = minimist(process.argv.slice(2));
    dotenv.config({ path: path.resolve(__dirname, "../.env." + stage) });
    return { stage };
  }

  dotenv.config({ path: path.resolve(__dirname, "../.env." + stage) });
  return { stage };
};

export const environmentRegions = {
  dev: "eu-central-1",
  prod: "eu-west-1",
};
