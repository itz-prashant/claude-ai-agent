import OpenAI from "openai";

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

    async chatCompletion(messages, stream=true){
        const client = this.getClient()

        const kwargs = {
            model: "llama3:latest", //"codellama:13b"
            messages: messages,
            stream: stream
        }
        if(stream){
            return this._streamResponse(client, messages)
        }else{
            return this._nonStreamResponse(client, kwargs)
        }
    }

    async _streamResponse(){

    }

    async _nonStreamResponse(client, kwargs){
        const response = await client.chat.completions.create({...kwargs})
        const choice = response.choice[0]
        const message = choice.message

        let text = null
        if(message.content){
            text = 
        }
        console.log(JSON.stringify(response))
        console.log(response)
    }
}