import OpenAI from "openai"

import type { Genre, Prompt } from "./system/types"
import { createStorytimeSystemPrompt, genreList } from "./system/prompts"
import {
	chatCompletionStream,
	frequency_penalty,
	max_tokens,
	presence_penalty,
	temperature,
	top_p,
} from "./openai-common"

/**
 * Use the Storytime pipeline to create a story.
 *
 * @param {String} userPrompt - The prompt the user
 *  entered.
 * @param {String} genre - The genre of the story
 *  selected by the user.
 */
export async function generateStory(userPrompt: string, genre: Genre) {
	console.log(
		`OpenAI settings: top_p=${top_p}, max_tokens=${max_tokens}, temperature=${temperature}, presence_penalty=${presence_penalty}, frequency_penalty=${frequency_penalty}`,
	)
	const genrePrompt = genreList[genre]
	const systemPrompt = createStorytimeSystemPrompt(
		genrePrompt.prompt,
		genrePrompt.caveat || "",
	)
	return chatCompletionStream(systemPrompt, userPrompt)
}
