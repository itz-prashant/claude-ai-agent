import path from "node:path"
import fs from "node:fs/promises"

export function resolvePath(base, targetPath){
    if(targetPath.isAbsolute(targetPath)){
        return path.resolve(targetPath)
    }

    return path.resolve(base, targetPath)
}

export async function isBinaryFile(path){
    try {
        const fileHandle = await fs.open(path, "r")
        const buffer = Buffer.alloc(8192)

        await fileHandle.read(buffer, 0,8192,0)
        await fileHandle.close()

        return buffer.includes(0)
    } catch {
        return false
    }
}