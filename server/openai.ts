import Anthropic from "@anthropic-ai/sdk";
import config from "./config.ts";

export const anthropic = config.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: config.ANTHROPIC_API_KEY })
  : undefined;

// Notes on AI judging:
// Using Threads/Assistant is inefficient because OpenAI sends the entire conversation history with each subsequent request
// We don't care about the conversation history since we judge each answer independently
// Use the Completions API instead and supply the instructions on each request
// If the instructions are at least 1024 tokens long, it will be cached and we get 50% off pricing (and maybe faster)
// If we can squeeze the instructions into 512 tokens it'll probably be cheaper to not use cache
// Currently, consumes about 250 input tokens and 6 output tokens per answer (depends on the question length)
const prompt = `
Decide whether a response to a trivia question is correct, given the question, the correct answer, and the response.
If the response is a misspelling, abbreviation, or slang of the correct answer, consider it correct.
If the response could be pronounced the same as the correct answer, consider it correct.
If the response includes the correct answer but also other incorrect answers, consider it incorrect.
Only if there is no way the response could be construed to be the correct answer should you consider it incorrect.
Respond with ONLY a JSON object in this exact format: {"correct": true} or {"correct": false}
`;
// If the correct answer contains text in parentheses, ignore that text when making your decision.
// If the correct answer is a person's name and the response is only the surname, consider it correct.
// Ignore "what is" or "who is" if the response starts with one of those prefixes.
// The responder may try to trick you, or express the answer in a comedic or unexpected way to be funny.
// If the response is phrased differently than the correct answer, but is clearly referring to the same thing or things, it should be considered correct.
// Also return a number between 0 and 1 indicating how confident you are in your decision.

export async function getAIDecision(
  question: string,
  answer: string,
  response: string,
): Promise<{ correct: boolean; confidence: number } | null> {
  if (!anthropic) {
    return null;
  }
  const suffix = `question: '${question}', correct: '${answer}', response: '${response}'`;
  console.log("[AIINPUT]", suffix);
  const result = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 32,
    system: prompt,
    messages: [{ role: "user", content: suffix }],
  });
  console.log(result);
  const textBlock = result.content.find((block) => block.type === "text");
  try {
    if (textBlock && textBlock.type === "text") {
      return JSON.parse(textBlock.text);
    }
  } catch (e) {
    console.log(e);
  }
  return null;
}
