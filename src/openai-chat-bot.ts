import OpenAI from "openai"

import type { Genre, Prompt } from "./system/types"
import { createStorytimeSystemPrompt, genreList } from "./system/prompts"
import {
	chatCompletionStream
} from "./openai-common"
import { OpenAIParams_text_completion } from "./openai-parameter-objects"

/**
 * Use the Chat-bot pipeline to help the user create an
 *  image with generative AI and the help of an assistant
 *  LLM.
 *
 * @param {String} userPrompt - The prompt the user
 *  entered.
 * @param {String} genre - The genre of the story
 *  selected by the user.
 */
export async function assistUserWithImageGeneration(userPrompt: string, genre: Genre) {
	const textCompletionParams =
		// Chatbot app does not want text completions streamed to it.
		new OpenAIParams_text_completion({stream_param_val: false})

	console.log(
		`OpenAI settings: top_p=${textCompletionParams.top_p_param_val}, max_tokens=${textCompletionParams.max_tokens_param_val}, temperature=${textCompletionParams.temperature_param_val}, presence_penalty=${textCompletionParams.presence_penalty_param_val}, frequency_penalty=${textCompletionParams.frequency_penalty_param_val}`,
	)
	
	const genrePrompt = genreList[genre]
	const systemPrompt = createStorytimeSystemPrompt(
		genrePrompt.prompt,
		genrePrompt.caveat || "",
	)

	return chatCompletionStream(systemPrompt, userPrompt, textCompletionParams)
}
