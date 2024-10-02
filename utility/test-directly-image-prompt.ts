// This test harness exercises the image creation assistant
//  prompt interaction with the LLM.

import { assistUserWithImageGeneration } from "../src/openai-chat-bot"
import { extractOpenAiResponseDetails } from "../src/websock-chat-bot"
import { OpenAIParams_text_completion } from "../src/openai-parameter-objects"
import { chatCompletionImmediate } from "../src/openai-common"

const errPrefix: string = '(test-directly-image-prompt) ';
const CONSOLE_CATEGORY = 'test-directly-image-prompt';

// The text completion parameter object for chatbot text
//  completion calls, initialized to the default starting
//  values.  (Note, they will change over time as we help
//  the user create better generative AI images).
const g_TextCompletionParams =
	// Chatbot app wants text completions streamed to it.
	new OpenAIParams_text_completion();

// -------------------- BEGIN: INTENT DETECTOR IDS ------------

// These are the IDs for each of the INTENT detectors we have created
//  so far.  They must be unique!

// -------------------- BEGIN: enumIntentDetectorId ------------
/**
 * Enum that contains all the intent detector IDs
 */
export enum enumIntentDetectorId {
	IS_TEXT_WANTED_ON_IMAGE = "is_text_wanted_on_image",
}

/**
 * This function returns TRUE if the given value is a valid
 *   enumIntentDetectorId value, FALSE if not.
 */
export function isValidenumIntentDetectorId(enIntentDetectorId: string) {
	return Object.values(enumIntentDetectorId).includes(enIntentDetectorId as enumIntentDetectorId);
}

// -------------------- END  : enumIntentDetectorId ------------


// -------------------- END  : INTENT DETECTOR IDS ------------

// -------------------- BEGIN: INTENT: IS_TEXT_WANTED_ON_IMAGE ------------

const isTextWantedOnImage_prompt: string = `
	You are an expert on determining if a block of text from a user 
	contains any expression of their desire to put text on an image
	during a generative AI image generation session.
	
	After analyzing the text, you return a simple JSON object as follows:
	
	{
		"is_text_wanted_on_image": <boolean>
	}
	
	Set the is_text_wanted_on_image property set to TRUE if you found
		the intent of wanting to put text on the image, FALSE
		if not.
		
	Some examples that should generate a response of TRUE:
	
	- "I want there to be a sign that says 'Will work for flies'"
	- "Put the letters XYZ on the side of the building"
	- "Write the number 123 on the top of the car"
	- "You can see the words 'go home now' on the shirt the man is wearing"
	
	Some counter-examples that should generate a response of FALSE:
	
	- "I want 3 dogs in the picture"
	- "I want the sign on the wall to have a red dot on it and nothing else"
	- "You can see the faint image of a cat fluttering in the smoke"
	- "Put a red door on the house"
	- "The number of clouds in the sky is 100"
`;

if (true) {
	// Use an immediate invoked function expression, so that we
//  can await the result.
	(async () => {
		try {
			const thePrompt =
				'I want a sign on the wall that screams "Death to all dirty towels!';
			const result =
				await chatCompletionImmediate(
					enumIntentDetectorId.IS_TEXT_WANTED_ON_IMAGE,
					isTextWantedOnImage_prompt,
					thePrompt,
					g_TextCompletionParams,
					true)

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