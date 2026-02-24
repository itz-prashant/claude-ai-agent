import * as z from "zod"
import { TokenUsageSchema } from "../client/response";

export const AgentEventTypeSchema = z.enum([
    "agent_start",
    "agent_end",
    "agent_error",
    "text_delta",
    "text_complete"
])

const AgentEventSchema = z.object({
    type: AgentEventTypeSchema,
    data: z.record(z.any()).default({}),
})

export class AgentEvent {
    constructor(type, data = {}) {
    const parsed = AgentEventSchema.parse({ type, data });
    this.type = parsed.type;
    this.data = parsed.data;
}

    static agentStart(message){
        return new AgentEvent(
            "agent_start",
            {message}
        )
    }

    static agentEnd(response=null, tokenUsage=null){
        const validateUsage = tokenUsage? TokenUsageSchema.parse(tokenUsage) : null
        return new AgentEvent(
            "agent_end",
            {
                response:response,
                usage: validateUsage
            }
        )
    }

    static agentError(error, details = null){
        return new AgentEvent(
            "agent_error",
            {
                error: error,
                details: details || {}
            }
        )
    }

    static textDelta(content){
        return new AgentEvent(
            "text_delta",
            {content}
        )
    }

    static textComplete(content){
        return new AgentEvent(
            "text_complete",
            {content}
        )
    }
}