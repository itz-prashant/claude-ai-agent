import { getSystemPrompt } from "../prompts/system.js";
import * as z from "zod"
import { countTokens } from "../utils/text.js";

const MessageItemSchema = z.object({
    role: z.string(),
    content: z.string(),
    token_count: z.number().nullable().optional(),
})


export class ContextManager {
    constructor(modelName= "codellama:13b"){
        this.systemPrompt = getSystemPrompt()
        this.modelName = modelName
        this.messages = []
    }

    addUserMessage(content){
       const tokenCount = countTokens(content, this.modelName)

       const item = MessageItemSchema.parse({
            role: "user",
            content: content,
            token_count: tokenCount
       })
       this.messages.push(item)
    }

    addAssistantMessage(content){
        const tokenCount = countTokens(content, this.modelName)

       const item = MessageItemSchema.parse({
            role: "assistant",
            content: content || "",
            token_count: tokenCount
       })
       this.messages.push(item)
    }

    getMessages(){
        const messages = []
        if(this.systemPrompt){
            messages.push({
                role: "system",
                content: this.systemPrompt
            })
        }
        for(const item of this.messages){
            const result = {role: item.role}
            if (item.content) {
                result.content = item.content
            }
            messages.push(result)
        }
        return messages
    }
}