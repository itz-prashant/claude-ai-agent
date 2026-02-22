import OpenAI from "openai";

class LLMClient {

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

    // async chatCompletion(message){
    //     const client = this.getClient();

    //     const response = await client.chat.completions.create({
    //         model: "llama3:latest",
    //         messages: message
    //     })
    //     console.log(JSON.stringify(response, null, 2));
    //     console.log("FULL RESPONSE:");
    //     // console.log(response);
    //     // console.log(response.choices[0].message);
    //     return response;

    // }
}

const llm = new LLMClient()
await llm.chatCompletion([
    { role: "user", content: "Hello" }
])