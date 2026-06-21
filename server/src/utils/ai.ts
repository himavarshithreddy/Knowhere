import OpenAI from "openai";

/**
 * Creates a chat completion, dynamically handling OpenRouter token/credit limit errors.
 * If the request fails because the requested max_tokens exceeds the user's remaining quota,
 * it parses the available tokens from the error message and retries the request with that limit.
 */
export async function createChatCompletionWithDynamicTokens(
  ai: OpenAI,
  params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
  defaultMaxTokens: number
): Promise<OpenAI.Chat.ChatCompletion> {
  const attemptParams = { ...params };
  if (attemptParams.max_tokens === undefined) {
    attemptParams.max_tokens = defaultMaxTokens;
  }

  try {
    return await ai.chat.completions.create(attemptParams);
  } catch (error: any) {
    const errorMessage = error?.message || "";
    
    // Parse error: e.g., "only 15960 is available but you have requested 16000 tokens"
    // or "only 15960 tokens are available..."
    const match = errorMessage.match(/only\s+(\d+)/i);
    if (match) {
      const availableTokens = parseInt(match[1], 10);
      
      // Give a tiny safety margin (e.g. 5 tokens) and ensure it's at least 1
      const safeMaxTokens = Math.max(1, availableTokens - 5);
      
      console.warn(
        `[AI Completion] Requested ${attemptParams.max_tokens} tokens but only ${availableTokens} are available. Retrying with ${safeMaxTokens} tokens.`
      );
      
      try {
        return await ai.chat.completions.create({
          ...params,
          max_tokens: safeMaxTokens,
        });
      } catch (retryError) {
        throw retryError;
      }
    }
    
    // If it's not a token limit error, rethrow the original error
    throw error;
  }
}
