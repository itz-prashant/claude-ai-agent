import fs from "node:fs/promises";
import * as z from "zod";
import { errorResult, successResult, Tool, ToolInvocationSchema, ToolKind } from "../base.js";
import { isBinaryFile, resolvePath } from "../../utils/path.js";
import { countTokens, truncateText } from "../../utils/text.js";

export const ReadFileParamsSchema = z.object({
  path: z
    .string()
    .describe(
      "Path to the file to read (relative to working directory or absolute)"
    ),
  offset: z
    .number()
    .int()
    .min(1, "Offset must be >= 1")
    .default(1)
    .describe("Line number to start reading from (1-based). Defaults to 1"),

  limit: z
    .number()
    .int()
    .min(1, "Limit must be >= 1")
    .nullable()
    .optional()
    .describe(
      "Maximum number of lines to read. If not specified, reads entire file."
    ),
});

export class ReadFileTool extends Tool {
  name = "read_file";
  description = (description =
    "Read the contents of a text file. Returns the file content with line numbers. " +
    "For large files, use offset and limit to read specific portions. " +
    "Cannot read binary files (images, executables, etc.).");

  kind = ToolKind.READ;

  schema() {
    return ReadFileParamsSchema;
  }

  MAX_FILE_SIZE = 1024 * 1024 * 10;
  MAX_OUTPUT_TOKEN = 25000

  async execute(invocation) {
    ToolInvocationSchema.parse(invocation);
    const params = ReadFileParamsSchema.parse(invocation.params);
    const path = resolvePath(invocation.cwd, params.path);

    let stat;
    let content;
    try {
      stat = await fs.stat(path);
    } catch {
      return errorResult(`File not found: ${path}`);
    }

    if (stat.size > this.MAX_FILE_SIZE) {
      return errorResult(
        `File too large (${(stat.size / (1024 * 1024)).toFixed(
          1
        )}MB). Maximum is ${(this.MAX_FILE_SIZE / (1024 * 1024)).toFixed(
          0
        )}MB.`,
        "",
        { metadata: { fileSize: stat.size } }
      );
    }

    if(await isBinaryFile(path)){
        const fileSizeMB = stat.size / (1024 * 1024)

        const sizeStr =
            fileSizeMB >= 1
                ? `${fileSizeMB.toFixed(2)}MB`
                : `${stat.size} bytes`

        return errorResult(
            `Cannot read binary file: ${path} (${sizeStr}) This tool only reads text files.`
        )
    }

    try {
      try {
      content = await fs.readFile(path, "utf-8")
    } catch (error) {
      content = await fs.readFile(path, "latin1")
    }

    const lines = content.split(/\r?\n/)
    const totalLines = lines.length

    if(totalLines === 0){
      return successResult("File is empty", metadata={
        line: 0
      })
    }

    const startIdx = Math.max(0, params.offset -1)
    let endIdx
    if(params.limit != null){
      endIdx = Math.min(startIdx + params.limit, totalLines)
    }else{
      endIdx = totalLines
    }

    const selectedLines = lines.slice(startIdx, endIdx)
    const formattedLines = []
    selectedLines.forEach((line, index)=>{
      const lineNumber =  startIdx + index + 1
      const paddedNumber = String(lineNumber).padStart(6, " ")
      formattedLines.push(`${paddedNumber}|${line}`)
    })

    let output = formattedLines.join("\n")
    const tokenCount = countTokens(output, model="codellama:13b")

    let truncated = false

    if(tokenCount > this.MAX_OUTPUT_TOKEN){
      output = truncateText(
        output,
        model= "codellama:13b",
        this.MAX_OUTPUT_TOKEN,
        suffix= `\n... [truncated ${totalLines} total lines]`
      )
      truncated = true
    }

    const metadataLines = []

    if (startIdx > 0 || endIdx < totalLines) {
      metadataLines.push(
        `Showing lines ${startIdx + 1}-${endIdx} of ${totalLines}`
      )
    }


    if (metadataLines.length > 0) {
      const header = metadataLines.join(" | ") + "\n\n"
      output = header + output
    }

    return successResult(
      output=output,
      truncated=truncated,
      metadata={
          "path": str(path),
          "total_lines": totalLines,
          "shown_start": startIdx + 1,
          "shown_end": endIdx,
      },
    )
    } catch (error) {
      return errorResult(
        `Failed to read file: ${error}`
      )
    }
  }
}
