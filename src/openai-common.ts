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
 * This call makes a non-streaming text completion call to the LLM.
 *
 * @param {string} intentDetectorId - The ID of the intent detector making the call.
 *  This must not be empty.
 * @param {string} systemPrompt - The prompt to use in the system role.
 * @param {string} userInput - The latest input from the user, to be included with the system prompt.
 * @param {OpenAIParams_text_completion} textCompletionParams - A valid OpenAI text completion call parameters object.
 * @param {boolean} bIsJsonResponseExpected - Set this to TRUE if
 *  the LLM is supposed to return a JSON object as its response,
 *  FALSE if you expect a pure text response.
 *
 * @returns {Promise<
 * 	{
 * 		intent_detector_id: string,
 * 		is_error: boolean,
 * 		error_message: string,
 * 		text_response: string,
 * 		json_response: object
 * 		date_time_of_response: number}>
 * 	}
 *
 *  An object containing the fields above that comprise the
 *   text completion response is returned.  Note, the
 *   date_time_of_response field is a Unix timestamp.
 */
export async function chatCompletionImmediate(
	intentDetectorId: string,
	systemPrompt: string,
	userInput: string,
	textCompletionParams: OpenAIParams_text_completion,
	bIsJsonResponseExpected: boolean
): Promise<{
		intent_detector_id: string;
		is_error: boolean;
		error_message: string;
		text_response: string;
		json_response: object;
		date_time_of_response: number }> {
	if (!intentDetectorId) {
		throw new Error("The intentDetectorId must not be empty.");
	}

	/**
	 * Helper function to get the current Unix timestamp.
	 * @returns {number} - The current Unix timestamp.
	 */
	function getTimestampOfTextCompletion(): number {
		return Math.floor(Date.now() / 1000);
	}

	console.log(`Creating chat completion (non-streaming) with system prompt: ${systemPrompt}`);
	console.log(`User prompt: ${userInput}`);

	const messages = [
		{
			role: "system",
			content: systemPrompt,
		},
		{
			role: "user",
			content: userInput,
		},
	] as ChatCompletionMessageParam[];

	try {
		// Call OpenAI's text completion API endpoint (non-streaming).
		const response = await oai.chat.completions.create({
			model: textCompletionParams.model_param_val,
			messages,
			frequency_penalty: textCompletionParams.frequency_penalty_param_val,
			presence_penalty: textCompletionParams.presence_penalty_param_val,
			stream: false, // Set stream to false for immediate response
			temperature: textCompletionParams.temperature_param_val,
			max_tokens: textCompletionParams.max_tokens_param_val,
			top_p: textCompletionParams.top_p_param_val,
		});

		let textResponse = ''
		let jsonResponse = {}

		// Aggregate text response
		textResponse =
			response.choices?.map((choice) => choice.message?.content).join(' ') || '';

		if (bIsJsonResponseExpected) {
			try {
				// We should be able to parse the text response into
				//  an object.
				jsonResponse = JSON.parse(textResponse);
			} catch (parseError) {
				return {
					intent_detector_id: intentDetectorId,
					is_error: true,
					error_message: `JSON parse error: ${parseError.message}`,
					text_response: textResponse,
					json_response: {},
					date_time_of_response: getTimestampOfTextCompletion(),
				};
			}
		}

		return {
			intent_detector_id: intentDetectorId,
			is_error: false,
			error_message: '',
			text_response: textResponse,
			json_response: jsonResponse,
			date_time_of_response: getTimestampOfTextCompletion(),
		};
	} catch (error: any) {
		// Error handling
		const errorMessage = error?.response?.data?.error?.message || error.message || "Unknown error occurred";
		const statusCode = error?.response?.status || 'Unknown status code';

		return {
			intent_detector_id: intentDetectorId,
			is_error: true,
			error_message: `Error ${statusCode}: ${errorMessage}`,
			text_response: '',
			json_response: {},
			date_time_of_response: getTimestampOfTextCompletion(),
		};
	}
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