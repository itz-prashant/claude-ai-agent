import { LLMClient } from "./client/llmClient.js";


async function main(){
    const client = new LLMClient()
    const messages = [
        {
            role: "user",
            content: "Hii"
        }
    ]
    // await client.chatCompletion(messages, false)
    for await (const event of client.chatCompletion(messages, true)) {
        console.log(JSON.stringify(event))
    }
    console.log("Done")
}

main()