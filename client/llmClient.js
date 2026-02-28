import OpenAI from "openai";
import {
  parseToolCallArguments,
  StreamEventSchema,
  TextDeltaSchema,
  TokenUsageSchema,
} from "./response.js";

export class LLMClient {
  constructor() {
    this.client = null;
    this.maxRetries = 3;
  }

  getClient() {
    if (this.client === null) {
      this.client = new OpenAI({
        baseURL: "http://localhost:11434/v1",
        apiKey: "ollama",
      });
    }
    return this.client;
  }

  async close() {
    if (this.client) {
      this.client = null;
    }
  }

  buildTools(tools) {
    return tools.map(tool => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description || "",
        parameters: tool.parameters || {
          type: "object",
          properties: {}
        }
      }
    }))
  }

  async *chatCompletion(messages,tools=undefined, stream = true) {
    const client = this.getClient();

    const kwargs = {
      model: "gpt-oss:20b",
      messages: messages,
      stream: stream,
    };
    if(tools && tools.length > 0){
      kwargs.tools = this.buildTools(tools)
      kwargs.tool_choice = "auto"
    }
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        if (stream) {
          for await (const event of this._streamResponse(client, kwargs)) {
            yield event;
          }
          // yield* this._streamResponse(client, kwargs) **shortcut**
        } else {
          const event = await this._nonStreamResponse(client, kwargs);
          yield event;
        }
        return;
      } catch (error) {
        if (error instanceof OpenAI.RateLimitError) {
          if (attempt < this.maxRetries) {
            const waitTime = 2 ** attempt * 1000;
            await new Promise((res) => setTimeout(res, waitTime));
          } else {
            yield StreamEventSchema.parse({
              type: "error",
              error: `Rate limit exceeded: ${error}`,
            });
            return
          }
        } else if (error instanceof OpenAI.APIConnectionError) {
          if (attempt < this.maxRetries) {
            const waitTime = 2 ** attempt * 1000;
            await new Promise((res) => setTimeout(res, waitTime));
          } else {
            yield StreamEventSchema.parse({
              type: "error",
              error: `Connection error: ${error}`,
            });
            return
          }
        } else if (error instanceof OpenAI.APIError) {
          yield StreamEventSchema.parse({
            type: "error",
            error: `API error: ${error}`,
          });
          return;
        }
        else {
          throw error;
        }
      }
    }
  }

  async *_streamResponse(client, kwargs) {
    const response = await client.chat.completions.create({ ...kwargs });

    let usage = undefined;
    let finish_reason = null;
    let toolCalls = {}

    for await (const chunk of response) {
      if (chunk.usage) {
        usage = TokenUsageSchema.parse({
          prompt_tokens: chunk.usage.prompt_tokens ?? 0,
          completion_tokens: chunk.usage.completion_tokens ?? 0,
          total_tokens: chunk.usage.total_tokens ?? 0,
          cached_tokens:
            chunk.usage?.prompt_tokens_details?.cached_tokens ??
            chunk.usage?.cached_tokens ??
            0,
        });
      }
      if (!chunk.choices) {
        continue;
      }
      const choice = chunk.choices[0];
      const delta = choice.delta;

      if (choice.finish_reason) {
        finish_reason = choice.finish_reason;
      }

      if (delta?.content) {
        yield StreamEventSchema.parse({
          type: "text_delta",
          text_delta: TextDeltaSchema.parse({ content: delta.content }),
        });
      }
     if (delta?.tool_calls) {
        for(const toolCallDelta of delta?.tool_calls){
          const idx = toolCallDelta.idx

          if(!toolCalls[idx]){
            toolCalls[idx]={
              id: toolCallDelta.id || "",
              name: "",
              arguments:""
            }
          }
          if(toolCallDelta.function){
            if(toolCallDelta.function.name){
              toolCalls[idx].name = toolCallDelta.function.name;

              yield StreamEventSchema.parse({
                type: "tool_call_start",
                tool_call_delta: {
                  call_id: toolCalls[idx].id,
                  name: toolCallDelta.function?.name,
                  arguments_delta: "",
                },
              })
            }
          }

          if (toolCallDelta.function?.arguments) {
            toolCalls[idx].arguments += toolCallDelta.function.arguments;

            yield {
              type: "tool_call_delta",
              tool_call_delta: {
                call_id: toolCalls[idx].id,
                name: toolCallDelta.function?.name,
                arguments_delta: toolCallDelta.function.arguments,
              },
            };
          }
        }
      }
    }

    for (const [idx, tc] of Object.entries(toolCalls)) {
        yield {
          type: "tool_call_complete",
          tool_call: {
            call_id: tc.id,
            name: tc.name,
            arguments: parseToolCallArguments(tc.arguments),
          },
        };
      }

    yield StreamEventSchema.parse({
      type: "message_complete",
      finish_reason,
      usage,
    });
  }

  async _nonStreamResponse(client, kwargs) {
    const response = await client.chat.completions.create({ ...kwargs });
    const choice = response.choices[0];
    const message = choice.message;

    let text_delta = null;
    let usage = null;
    let toolCalls = []
     if(message.tool_calls){
        for(const tc of message.tool_calls){
          toolCalls.push({
            call_id: tc.id,
            name: tc.function?.name,
            arguments: parseToolCallArguments(tc.function?.arguments),
          })
        }
    }

    if (message.content) {
      text_delta = TextDeltaSchema.parse({
        content: message.content,
      });
    }

    if (response.usage) {
      usage = TokenUsageSchema.parse({
        prompt_tokens: response.usage.prompt_tokens ?? 0,
        completion_tokens: response.usage.completion_tokens ?? 0,
        total_tokens: response.usage.total_tokens ?? 0,
        cached_tokens:
          response.usage?.prompt_tokens_details?.cached_tokens ??
          response.usage?.cached_tokens ??
          0,
      });
    } else {
      usage = null;
    }

    return StreamEventSchema.parse({
      type: "message_complete",
      text_delta,
      finish_reason: choice.finish_reason,
      usage,
    });
  }
}
