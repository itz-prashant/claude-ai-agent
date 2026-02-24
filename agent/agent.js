import { LLMClient } from "../client/llmClient.js";
import { AgentEvent } from "./events.js";

export class Agent {

    constructor(){
        this.client = new LLMClient()

    }

    async *run(message){
        let finalResponse
        yield AgentEvent.agentStart(message)

        for await(const event of this.#agenticLoop(message)){
            yield event
            if(event.type == "text_complete"){
                finalResponse = event.data.content
            }
        }

        yield AgentEvent.agentEnd(finalResponse)
    }

    async *#agenticLoop(message){
        const messages = [
            { role: "user", content: message }
        ]

        let responseText = ""

        for await(const event of this.client.chatCompletion(messages, true)){
            // console.log(JSON.stringify(event));
            if(event.type == "text_delta"){
                const content = event.text_delta.content
                responseText += content
                yield AgentEvent.textDelta(content)
            }else if(event.type == "error"){
                yield AgentEvent.agentError(
                    event.error || "Unknown error occurred"
                )
            }
        }
        if(responseText){
            yield AgentEvent.textComplete(responseText)
        }
    }

    async enter(){
        return this
    }

    async exit(){
        if(this.client){
            await this.client.close()
            this.client = null
        }
    }

}