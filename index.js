import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { Agent } from "./agent/agent.js";
import { getTuiConsole, TUI } from "./ui/tui.js";

const tuiConsole = getTuiConsole()
export class CLI {
    constructor(){
        this.agent = null
        this.tui = new TUI(tuiConsole)
    }

    async runSingle(message){
        const agent = new Agent();

        try {
            await agent.enter();
            this.agent = agent
            return await this.#processMessage(message)
        }finally{
            await agent.exit()
        }
    }

    async #processMessage(message){
        if(!this.agent){
            return null
        }else{
            for await (const event of this.agent.run(message)){
                if(event.type == "text_delta"){
                    const content = event.data.content ?? ""
                    this.tui.streamAssistantDelta(content)
                }
            }
        }
    }
}

async function main() {
  yargs(hideBin(process.argv)).command(
    "$0 [prompt]",
    "Run chat",
    () => {},
    async (argv) => {
      const cli = new CLI();
    //   const messages = [
    //     {
    //       role: "user",
    //       content: argv.prompt,
    //     },
    //   ];
    
    if(argv.prompt){
        const res = await cli.runSingle(argv.prompt)
        if (res == null) {
            process.exit(1);
        }
      }
    }
  )
  .parse()
}

main();
