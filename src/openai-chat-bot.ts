import OpenAI from "openai"

import {
	chatCompletionStream
} from "./openai-common"
import { OpenAIParams_text_completion } from "./openai-parameter-objects"

const CONSOLE_CATEGORY = 'open-ai-chat-bot'

// This is the prompt we pass with each call when in REFINE mode
const g_SystemPrompt_refine =
	`To be determined.`;

// The text completion parameter object for chatbot text
//  completion calls, initialized to the default starting
//  values.  (Note, they will change over time as we help
//  the user create better generative AI images.
const g_TextCompletionParams =
	// Chatbot app does not want text completions streamed to it.
	new OpenAIParams_text_completion({stream_param_val: false})

/**
 * Given a user prompt and the current image generation parameters,
 *  create a new image generation prompt.
 *
 * @param {String} userPrompt - The current prompt from the user.
 *
 * @return {String} - Returns the system prompt to use in the
 *  upcoming text completion call.
 */
function createChatBotSystemPrompt(userPrompt: string): string {
	console.info(CONSOLE_CATEGORY, `Current user prompt: ${userPrompt}`);

	throw new Error(`Not implemented yet.`);

	return 'Not implemented yet.';
}

/**
 * Use the Chat-bot pipeline to help the user create an
 *  image with generative AI and the help of an assistant
 *  LLM.
 *
 * @param {String} userPrompt - The prompt the user
 *  entered.
 */
export async function assistUserWithImageGeneration(userPrompt: string) {
	console.log(
		`OpenAI settings: top_p=${g_TextCompletionParams.top_p_param_val}, max_tokens=${g_TextCompletionParams.max_tokens_param_val}, temperature=${g_TextCompletionParams.temperature_param_val}, presence_penalty=${g_TextCompletionParams.presence_penalty_param_val}, frequency_penalty=${g_TextCompletionParams.frequency_penalty_param_val}`,
	)
	
	const systemPrompt = createChatBotSystemPrompt(userPrompt)

	return chatCompletionStream(systemPrompt, userPrompt, g_TextCompletionParams)
}
