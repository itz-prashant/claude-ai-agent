import * as z from "zod"

export const StreamEventTypeSchema = z.enum([
    "text_delta",
    "message_complete",
    "error",
    "tool_call_start",
    "tool_call_delta",
    "tool_call_complete",
])

export const TextDeltaSchema = z.object({
    content: z.string()
})

export const TokenUsageSchema = z.object({
  prompt_tokens: z.number().int().nonnegative().default(0),
  completion_tokens: z.number().int().nonnegative().default(0),
  total_tokens: z.number().int().nonnegative().default(0),
  cached_tokens: z.number().int().nonnegative().default(0),
})

const ToolCallDeltaSchema = z.object({
    call_id: z.string(),
    name: z.string().optional(),
    arguments_delta: z.string().default("")
})

export const ToolCall  = z.object({
    call_id: z.string(),
    name: z.string().optional(),
    arguments: z.string().default("")
})

export const StreamEventSchema = z.object({
    type: StreamEventTypeSchema,
    text_delta: TextDeltaSchema.optional(),
    error: z.string().optional(),
    finish_reason: z.string().optional(),
    usage: TokenUsageSchema.optional(),
    tool_call_delta: ToolCallDeltaSchema.optional(),
    tool_call: ToolCall.optional(),
})

export function addTokenUsage(a, b){
    const parsedA = TokenUsageSchema.parse(a)
    const parsedB = TokenUsageSchema.parse(b)

    return {
        prompt_tokens: parsedA.prompt_tokens + parsedB.prompt_tokens,
        completion_tokens: parsedA.completion_tokens + parsedB.completion_tokens,
        total_tokens: parsedA.total_tokens + parsedB.total_tokens,
        cached_tokens: parsedA.cached_tokens + parsedB.cached_tokens,
    }
}

export function parseToolCallArguments(argumentsStr) {
  if (!argumentsStr) {
    return {};
  }

  try {
    return JSON.parse(argumentsStr);
  } catch (err) {
    return { raw_arguments: argumentsStr };
  }
}