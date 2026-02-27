import * as z from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"

export const ToolKind = Object.freeze({
    READ: "read",
    WRITE:"write",
    SHELL:"shell",
    NETWORK:"network",
    MEMORY:"memory",
    MCP:"mcp"
})

// export class ToolInvocation{
//     constructor({params, cwd}){
//         this.params = params,
//         this.cwd = cwd
//     }
// }

export const ToolInvocationSchema = z.object({
    params: z.record(z.any()),
    cwd: z.string()
})

// export class ToolResult {
//     constructor({ success, output, error = null, metadata = {} }) {
//         this.success = success;     // boolean
//         this.output = output;       // string
//         this.error = error;         // string | null
//         this.metadata = metadata;   // object
//     }
// }

export const ToolResultSchema = z.object({
    success: z.boolean(),
    output: z.string(),
    error: z.string().nullable().optional(),
    metadata: z.record(z.any()).optional(),
    truncated: z.boolean().default(false),

    error: z.string().nullable().optional(),
})

export const ToolConfirmationSchema = z.object({
    toolName: z.string(),
    params: z.record(z.any()),
    description: z.string()
})

export function errorResult(error, output = "", extra = {}) {
    return ToolResultSchema.parse({
        success: false,
        output,
        error,
        ...extra
    })
}
export function successResult(output = "", extra = {}) {
    return ToolResultSchema.parse({
        success: true,
        output,
        error: null,
        ...extra
    })
}

export class Tool{
    name= "base_tool";
    description= "Base tool";
    kind= ToolKind.READ;

    constructor(){
        if (new.target === Tool) {
            throw new Error("Cannot instantiate abstract class");
        }
    }

    schema(){
        throw new Error("Tool must define schema property or class attribute");
    }

    async execute(invocation) {
        throw new Error("Tool must implement execute method");
    }

    validateParams(params){
        const schema = this.schema()

        try {
            schema.parse(params)
            return []
        } catch (e) {
            if (e.errors) {
                    return e.errors.map(err => {
                        const field = err.path.join(".");
                        return `Parameter '${field}': ${err.message}`;
                    });
                }
            return [String(e)];
        }
    }

    isMutating() {
        return [
            ToolKind.WRITE,
            ToolKind.SHELL,
            ToolKind.NETWORK,
            ToolKind.MEMORY
        ].includes(this.kind);
    }

    async getConfirmation(invocation) {
        ToolInvocationSchema.parse(invocation)
        if (!this.isMutating()) return null

        const confirmation = {
            toolName: this.name,
            params: invocation.params,
            description: `Execute ${this.name}`
        }
        ToolConfirmationSchema.parse(confirmation)

        return confirmation
    }

    toOpenAISchema(){
        const schema = this.schema()

        if (!schema || typeof schema !== "object") {
            throw new Error(`Invalid schema for tool ${this.name}`)
        }

        if(schema instanceof z.ZodType){
            const jsonSchema = zodToJsonSchema(schema)
            return {
                name: this.name,
                description: this.description,
                parameters: {
                    type: "object",
                    properties: jsonSchema.properties || {},
                    required: jsonSchema.required || []
                }
            }
        }
        if (typeof schema === "object") {
            return {
                name: this.name,
                description: this.description,
                parameters: schema.parameters ?? schema
            }
        }

        throw new Error(`Invalid schema type for tool ${this.name}`)
    }
}