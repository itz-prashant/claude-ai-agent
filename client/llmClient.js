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
            model: "codellama:13b",
            messages: messages,
            stream: stream
        }
        if(stream){
            for await (const event of this._streamResponse(client, kwargs)){
                yield event
            }
            // yield* this._streamResponse(client, kwargs) **shortcut**
        }else{
            const event = await this._nonStreamResponse(client, kwargs)
            yield event
        }
        return
    }

    async *_streamResponse(client, kwargs){
        const response = await client.chat.completions.create({...kwargs})
        let usage = undefined;
        let finish_reason = null 

        for await (const chunk of response){
            if(chunk.usage){
                    usage = TokenUsageSchema.parse({
                    prompt_tokens: chunk.usage.prompt_tokens ?? 0,
                    completion_tokens: chunk.usage.completion_tokens ?? 0,
                    total_tokens: chunk.usage.total_tokens ?? 0,
                    cached_tokens: chunk.usage?.prompt_tokens_details?.cached_tokens 
                    ?? chunk.usage?.cached_tokens 
                    ?? 0
                })
            }
            if(!chunk.choices){
                continue;
            }
            const choice = chunk.choices[0]
            const delta = choice.delta

            if(choice.finish_reason){
                finish_reason = choice.finish_reason
            }

            if (delta?.content){
                yield StreamEventSchema.parse({
                    type: "text_delta",
                    text_delta: TextDeltaSchema.parse({content: delta.content})
                })
            }
        }

        yield StreamEventSchema.parse({
            type: "message_complete",
            finish_reason,
            usage
        })
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