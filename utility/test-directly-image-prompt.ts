// This test harness exercises the image creation assistant
//  prompt interaction with the LLM.

import {
	assistUserWithImageGeneration,
	executeIntentCompletion,
	g_TextCompletionParamsForIntentDetector,
} from "../src/openai-chat-bot"
import { extractOpenAiResponseDetails } from "../src/websock-chat-bot"
import { OpenAIParams_text_completion } from "../src/openai-parameter-objects"
import { chatCompletionImmediate } from "../src/openai-common"
import { enumIntentDetectorId } from "../src/intents/enum-intents"

const errPrefix: string = '(test-directly-image-prompt) ';
const CONSOLE_CATEGORY = 'test-directly-image-prompt';

if (true) {
	// Use an immediate invoked function expression, so that we
//  can await the result.
	(async () => {
		try {
			const userInput = 'I want a sign on the wall that screams "Death to all dirty towels!';

			// const userInput = 'I want a sign that the car is not moving!'

			const result =
				await executeIntentCompletion(
					enumIntentDetectorId.IS_TEXT_WANTED_ON_IMAGE,
					g_TextCompletionParamsForIntentDetector,
					userInput)

			console.info(`${errPrefix}result object:`);
			console.dir(result, {depth: null, colors: true});

			// Initialize the state flags to make extractOpenAiResponseDetails()
			//  happy.
			const state = {
				streaming_audio: false,
				streaming_text: false,
				waiting_for_images: false,
				current_request_id: "",
			};

			console.info(CONSOLE_CATEGORY, `JSON response received:\n${result.json_response}`)
			console.info(CONSOLE_CATEGORY, `Done`)
		} catch (err) {
			console.info(`${errPrefix}err object:`);
			console.dir(err, {depth: null, colors: true});
		}
	})();
}

// -------------------- END  : INTENT: IS_TEXT_WANTED_ON_IMAGE ------------

/*
// Use an immediate invoked function expression, so that we
//  can await the result.
(async () => {
	try {
		const thePrompt =
			'A green frog.'
		const result =
			await assistUserWithImageGeneration(thePrompt)

		console.info(`${errPrefix}result object:`);
		console.dir(result, {depth: null, colors: true});

		// Initialize the state flags to make extractOpenAiResponseDetails()
		//  happy.
		const state = {
			streaming_audio: false,
			streaming_text: false,
			waiting_for_images: false,
			current_request_id: "",
		};

		// extractOpenAiResponseDetails() requires a payload object
		//  with the following format.
		const payload =
			{
				prompt: thePrompt,
				textCompletionParams: g_TextCompletionParams
			}

		// Extract the accumulated text from the streamed response.
		const allText = await extractOpenAiResponseDetails(
			state,
			result,
			null,
			payload
		)

		console.info(CONSOLE_CATEGORY, `allText received:\n${allText}`)
		console.info(CONSOLE_CATEGORY, `Done`)
	} catch (err) {
		console.info(`${errPrefix}err object:`);
		console.dir(err, {depth: null, colors: true});
	}
})();
*/