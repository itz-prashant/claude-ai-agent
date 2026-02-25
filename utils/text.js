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