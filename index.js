import { LLMClient } from "./client/llmClient.js";


async function main(){
    const client = new LLMClient()
    const messages = [
        {
            role: "user",
            content: "Hii whats's up"
        }
    ]
    // await client.chatCompletion(messages, false)
    for await (const event of client.chatCompletion(messages, false)) {
        console.log(event)
    }
    console.log("Done")
}

main()