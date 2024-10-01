// This module contains code shared by the different apps this
//  back-end server supports.

import OpenAI from "openai"
import { ChatCompletionMessageParam } from "openai/resources/chat/completions"
import { OpenAIParams_text_completion } from "./openai-parameter-objects"

export const oai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
})

/**
 * This call makes the actual text completion call to the LLM.
 *
 * @param {String} systemPrompt - The prompt to use in the
 *  system role.
 * @param {String} userPrompt - The prompt entered by the user
 *  to be included with the system prompt.
 * @param {OpenAIParams_text_completion} textCompletionParams - A
 *  valid OpenAI text completion call parameters object.
 */
export async function chatCompletionStream(
		systemPrompt: string,
		userPrompt: string,
		textCompletionParams: OpenAIParams_text_completion) {
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
		model: textCompletionParams.model_param_val,
		messages,
		frequency_penalty: textCompletionParams.frequency_penalty_param_val,
		presence_penalty: textCompletionParams.presence_penalty_param_val,
		// stream: textCompletionParams.stream_param_val,
		// Currently we always want text completions streamed to us.
		stream: true,
		temperature: textCompletionParams.temperature_param_val,
		max_tokens: textCompletionParams.max_tokens_param_val,
		top_p: textCompletionParams.top_p_param_val,
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