import { LLMClient } from "../client/llmClient.js";
import { ContextManager } from "../context/manager.js";
import { createDefaultRegistry } from "../tools/registry.js";
import { AgentEvent } from "./events.js";

export class Agent {

    constructor(){
        this.client = new LLMClient()
        this.contextManager = new ContextManager()
        this.toolRegistry = createDefaultRegistry()
    }

    async *run(message){
        let finalResponse
        yield AgentEvent.agentStart(message)

        // add user message to context
        this.contextManager.addUserMessage(message)

        for await(const event of this.#agenticLoop()){
            yield event
            if(event.type == "text_complete"){
                finalResponse = event.data.content
            }
        }

        yield AgentEvent.agentEnd(finalResponse)
    }

    async *#agenticLoop(){
        let responseText = ""
        let toolSchema = this.toolRegistry.getSchemas()
        let toolCalls = []
        for await(const event of this.client.chatCompletion(
            this.contextManager.getMessages(),
            toolSchema.length ? toolSchema : undefined
        )){
            console.log("events",JSON.stringify(event));
            if(event.type == "text_delta"){
                const content = event.text_delta.content
                responseText += content
                yield AgentEvent.textDelta(content)
            }else if(event.type == "tool_call_complete"){
                if(event.tool_call){
                    toolCalls.push(event.tool_call)
                }
            }
            else if(event.type == "error"){
                yield AgentEvent.agentError(
                    event.error || "Unknown error occurred"
                )
            }
        }
        this.contextManager.addAssistantMessage(responseText || "")
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