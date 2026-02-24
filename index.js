import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { LLMClient } from "./client/llmClient.js";


async function main() {
  yargs(hideBin(process.argv)).command(
    "$0 [prompt]",
    "Run chat",
    () => {},
    async (argv) => {
      const client = new LLMClient();
      const messages = [
        {
          role: "user",
          content: argv.prompt,
        },
      ];
      // await client.chatCompletion(messages, false)
      for await (const event of client.chatCompletion(messages, true)) {
        console.log(JSON.stringify(event));
      }
      console.log("Done");
    }
  )
  .parse()
}

main();
