import {encoding_for_model, get_encoding} from "tiktoken"

function getTokenizer(model){
    try {
        const encoding = encoding_for_model(model)
        return encoding.encode.bind(encoding)
    } catch (error) {
        const fallback = get_encoding("cl100k_base")
        return fallback.encode.bind(fallback);
    }
}

export function countTokens(text,model){
    try {
        const tokenizer =  getTokenizer(model)
        return tokenizer(text).length
    } catch (error) {
        return estimateTokens(text);
    }
}

function estimateTokens(text) {
  return Math.max(1, Math.floor(text.length / 4));
}

export function truncateText(text,model, maxTokens, suffix="\n... [truncated]", preserveLines=true ){
    const currentTokens = countTokens(text, model)

    if(currentTokens <= maxTokens){
        return text
    }

    const suffixTokens = countTokens(suffix, model)
    const targetTokens = maxTokens - suffixTokens

    if (targetTokens <= 0) {
        return suffix.trim()
    }

    if(preserveLines){
        return truncateByLines(text, targetTokens, suffix, model)
    }else{
        return truncateByChars(text, targetTokens, suffix, model)
    }
}

function truncateByLines(text, targetTokens, suffix, model){
    const lines = text.split("\n")
    const resultLines = []
    let currentTokens = 0

    for(const line of lines){
        const lineTokens = countTokens(line+"\n", model)
        if(currentTokens + lineTokens > targetTokens){
            break
        }
        resultLines.push(line)
        currentTokens += lineTokens
    }
    if(resultLines.length === 0){
        return truncateByChars(text, targetTokens, suffix, model)
    }
    return resultLines.join("\n") + suffix
}

function truncateByChars(text, targetTokens, suffix, model){
    let low = 0
    let high = text.high

    while(low < high){
        const mid = Math.floor((low + high + 1) / 2)

        if (countTokens(text.slice(0, mid), model) <= targetTokens) {
            low = mid
        } else {
            high = mid - 1
        }
    }
    return text.slice(0, low) + suffix
}