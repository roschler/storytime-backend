// This module contains code shared by the different apps this
//  back-end server supports.

import OpenAI from "openai"
import { ChatCompletionMessageParam } from "openai/resources/chat/completions"

export const oai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
})

// Typescript will complain if we don't cast these:
export const top_p = Number(process.env.OPENAI_TOP_P || 0.5)
export const max_tokens = Number(process.env.OPENAI_MAX_TOKENS || 150)
export const temperature = Number(process.env.OPENAI_TEMPERATURE || 0.5)
export const presence_penalty = Number(process.env.OPENAI_PRESENCE_PENALTY || 0.5)
export const frequency_penalty = Number(process.env.OPENAI_FREQUENCY_PENALTY || 0.5)

export const model = process.env.OPENAI_MODEL || "gpt-3.5-turbo"

/**
 * This call makes the actual text completion call to the LLM.
 *
 * @param {String} systemPrompt - The prompt to use in the
 *  system role.
 * @param {String} userPrompt - The prompt entered by the user
 *  to be included with the system prompt.
 */
export async function chatCompletionStream(
		systemPrompt: string,
		userPrompt: string) {
	console.log(
		`Creating chat completion stream with system prompt: ${systemPrompt}`,
	)
	console.log(`User prompt: ${userPrompt}`)
	const messages = [
		{
			role: "system",
			content: systemPrompt,
		},
		{
			role: "user",
			content: userPrompt,
		},
	] as ChatCompletionMessageParam[]

	// Call OpenAI's text completion API endpoint.
	return oai.chat.completions.create({
		model,
		messages,
		frequency_penalty,
		presence_penalty,
		stream: true,
		temperature,
		max_tokens,
		top_p,
	})
}

/**
 * This function checks to see if the prompt
 *  is flagged as harmful before passing the
 *  request to OpenAI.
 *
 * @param {String} input - The user input to
 *  inspect.
 */
export async function isFlagged(input: string) {
	const response =
		await oai.moderations.create({ input })
	const [results] =
		response.results // we only need the first result

	if (results?.flagged === true)
		return true;
	else
		return false;
}