import { errorResult, Tool, ToolInvocationSchema } from "./base.js"
import { getAllBuiltinTools } from "./builtin/index.js"

export class ToolRegistry {
    
    constructor(){
        this.tools = {}
    }

    register(tool){
        if(!(tool instanceof Tool)){
            throw new Error("Only Tool instances can be registered")
        }
        if (this.tools[tool.name]) {
            console.warn(`Overwriting existing tool: ${tool.name}`)
        }
        this.tools[tool.name] = tool
        console.debug(`Registered tool: ${tool.name}`)
    }

    unregister(name){
        if(name in this.tools){
            delete this.tools[name]
            return true
        }
        return false
    }

    get(name){
        if(name in this.tools){
            return this.tools[name]
        }
        return null
    }

    getTools(){
        const tools = []

        for(const tool of Object.values(this.tools)){
            tools.push(tool)
        }
        return tools
    }

    getSchemas(){
        return this.getTools().map(tool=> tool.toOpenAISchema())
    }

    async invoke(name, params, cwd = null) {
        const tool = this.get(name)

        if (!tool) {
            return errorResult(
                `Unknown tool: ${name}`,
                { metadata: { tool_name: name } }
            )
        }

       const validationError = tool.validateParams(params)
       if(validationError.lenght > 0){
        return errorResult(
            `Invalid parameters: ${validationError.join("; ")}`,
            {
            metadata: {
                tool_name: name,
                validation_errors: validationError
                }
            }
        )
       }

       const invocation = ToolInvocationSchema.parse({
        params,
        cwd
        }
       )
       try {
           return await tool.execute(invocation)
       } catch (error) {
            console.debug(`Tool ${name} raised unexpected error`)
            return errorResult(
                `Internal error : ${error}`,
                {
                metadata: {
                    tool_name: name,
                    name
                    }
                }
            )
       }
    }
}

export function createDefaultRegistry(){
    const registry = new ToolRegistry()
    for (const ToolClass of getAllBuiltinTools()){
        registry.register(new ToolClass())
    }
    return registry
}