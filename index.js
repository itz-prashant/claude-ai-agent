import { LLMClient } from "./client/llmClient.js";


async function main(){
    const client = new LLMClient()
    const messages = [
        {
            role: "user",
            content: "Hii whats's up"
        }
    ]
    await client.chatCompletion(messages, false)
    console.log("Done")
}

main()