import OpenAI from "openai";
import {StreamEventSchema, TextDeltaSchema, TokenUsageSchema } from "./response.js";

export class LLMClient {

    constructor(){
        this.client = null;
    }

    getClient(){
        if(this.client === null){
            this.client = new OpenAI({
                baseURL: "http://localhost:11434/v1",
                apiKey: "ollama"
            })
        }
        return this.client
    }

    async close(){
        if(this.client){
            this.client = null
        }
    }

    async *chatCompletion (messages, stream=true){
        const client = this.getClient()

        const kwargs = {
            model: "codellama:13b", // "llama3:latest"
            messages: messages,
            stream: stream
        }
        if(stream){
            return this._streamResponse(client, messages)
        }else{
            const event = await this._nonStreamResponse(client, kwargs)
            yield event
        }
        return
    }

    async _streamResponse(){

    }

    async _nonStreamResponse(client, kwargs){
        const response = await client.chat.completions.create({...kwargs})
        const choice = response.choices[0]
        const message = choice.message

        let text_delta = null
        let usage = null
        if(message.content){
            text_delta = TextDeltaSchema.parse({
                content: message.content
            })
        }

        if(response.usage){
            usage = TokenUsageSchema.parse({
                prompt_tokens: response.usage.prompt_tokens ?? 0,
                completion_tokens: response.usage.completion_tokens ?? 0,
                total_tokens: response.usage.total_tokens ?? 0,
                cached_tokens: response.usage?.prompt_tokens_details?.cached_tokens 
                ?? response.usage?.cached_tokens 
                ?? 0
            })
        }else{
            usage = null
        }

        return StreamEventSchema.parse({
            type: "message_complete",
            text_delta,
            finish_reason: choice.finish_reason,
            usage

        })
    }
}