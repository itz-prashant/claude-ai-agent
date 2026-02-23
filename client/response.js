import * as z from "zod"

export const EventTypeSchema = z.enum([
    "text_delta",
    "message_complete",
    "error"
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

export const StreamEventSchema = z.object({
    type: EventTypeSchema,
    text_delta: TextDeltaSchema.optional(),
    error: z.string().optional(),
    finish_reason: z.string().optional(),
    usage: TokenUsageSchema.optional()
})

// export const StreamEventSchema = z.discriminatedUnion("type", [

//   z.object({
//     type: z.literal("text_delta"),
//     text_delta: TextDeltaSchema
//   }),

//   z.object({
//     type: z.literal("message_complete"),
//     finish_reason: z.string().optional(),
//     usage: TokenUsageSchema.optional()
//   }),

//   z.object({
//     type: z.literal("error"),
//     error: z.string()
//   })

// ])

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