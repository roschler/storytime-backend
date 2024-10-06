// This test harness exercises the image creation assistant
//  prompt interaction with the LLM.

import {
	buildChatBotSystemPrompt, g_TextCompletionParams,
	g_TextCompletionParamsForIntentDetector, processAllIntents, showIntentResultObjects,
} from "../src/openai-chat-bot"
import {
	enumIntentDetectorId,
	MIN_STEPS,
	NUM_GUIDANCE_SCALE_ADJUSTMENT_VALUE,
	NUM_STEPS_ADJUSTMENT_VALUE,
} from "../src/intents/enum-intents"
import { generateImages_chat_bot, generateImages_storytime } from "../src/system/handlers"
import fs from "fs"
import path from "node:path"
import { chatCompletionImmediate } from "../src/openai-common"
import {
	ChatHistory, ChatVolley,
	CurrentChatState,
	readChatHistory,
	readOrCreateChatHistory, writeChatHistory,
} from "../src/chat-volleys/chat-volleys"
import { enumImageGenerationModelId } from "../src/enum-image-generation-models"
import { ImageGeneratorLlmJsonResponse } from "../src/openai-parameter-objects"

const errPrefix: string = '(test-directly-image-prompt) ';
const CONSOLE_CATEGORY = 'test-directly-image-prompt';

/**
 * Create a simple page to view the images created
 *  during the test harness session.
 *
 * @param imageUrls - The URLs to show on the page.
 */
function generateHTML(imageUrls: string[]) {
	const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Image Gallery</title>
  <style>
    body {
      font-family: Arial, sans-serif;
    }
    .image-row {
      margin-bottom: 20px;
    }
    img {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  <h1>Image Gallery</h1>
  ${imageUrls.map(url => `
    <div class="image-row">
      <img src="${url}" alt="Image from ${url}" />
    </div>
  `).join('')}
</body>
</html>
  `;
	return htmlContent;
}

// -------------------- BEGIN: INTENT DETECTOR RESULT ARRAY HELPER FUNCTIONS ------------

/**
 * Validates the boolean value for a given intent detector id and property name from an array of response objects.
 *
 * @param aryResponseObjs - The array of response objects to iterate over.
 * @param intentDetectorId - The intent detector ID to search for.
 * @param propName - The property name to check within the matching object.
 */
function getBooleanIntentDetectionValue(
	aryResponseObjs: object[],
	intentDetectorId: string,
	propName: string
): boolean | null {
	// Validate intentDetectorId
	if (!intentDetectorId.trim()) {
		throw new Error('The intentDetectorId cannot be empty.');
	}

	// Validate propName
	if (!propName.trim()) {
		throw new Error('The propName cannot be empty.');
	}

	// Iterate over aryResponseObjs
	for (const obj of aryResponseObjs) {
		// Check if the object's intent_detector_id matches the provided intentDetectorId
		if ((obj as any).intent_detector_id === intentDetectorId) {
			// Check if the object has the property propName
			if (!(propName in obj)) {
				throw new Error(`The property '${propName}' does not exist in object with intent_detector_id '${intentDetectorId}'.`);
			}

			const value = (obj as any)[propName];

			// Check if the value is boolean
			if (typeof value !== 'boolean') {
				throw new Error(`The property '${propName}' in object with intent_detector_id '${intentDetectorId}' is not a boolean.`);
			}

			return value;
		}
	}

	// If no object with the matching intentDetectorId is found,
	//  return NULL to let the caller know this.
	return null;
}

/**
 * Retrieves the string value for a given intent detector id and property name from an array of response objects.
 *
 * @param {object[]} aryResponseObjs - The array of response objects to iterate over.
 * @param {string} intentDetectorId - The intent detector ID to search for.
 * @param {string} propName - The property name to check within the matching object.
 * @returns {string | null} - The string value found in the object for the given intent detector ID and property, or null if no match is found.
 * @throws {Error} If the property value is not a string or if the property is missing.
 */
function getStringIntentDetectionValue(
	aryResponseObjs: object[],
	intentDetectorId: string,
	propName: string
): string | null {
	// Validate intentDetectorId
	if (!intentDetectorId.trim()) {
		throw new Error('The intentDetectorId cannot be empty.');
	}

	// Validate propName
	if (!propName.trim()) {
		throw new Error('The propName cannot be empty.');
	}

	// Iterate over aryResponseObjs
	for (const obj of aryResponseObjs) {
		// Check if the object's intent_detector_id matches the provided intentDetectorId
		if ((obj as any).intent_detector_id === intentDetectorId) {
			// Check if the object has the property propName
			if (!(propName in obj)) {
				throw new Error(`The property '${propName}' does not exist in object with intent_detector_id '${intentDetectorId}'.`);
			}

			const value = (obj as any)[propName];

			// Check if the value is a string
			if (typeof value !== 'string') {
				throw new Error(`The property '${propName}' in object with intent_detector_id '${intentDetectorId}' is not a string.`);
			}

			return value;
		}
	}

	// If no object with the matching intentDetectorId is found, return null
	return null;
}

/**
 * Checks if the string value for a given intent detector ID and property name is equal to the desired value.
 *
 * @param {object[]} aryResponseObjs - The array of response objects to iterate over.
 * @param {string} intentDetectorId - The intent detector ID to search for.
 * @param {string} propName - The property name to check within the matching object.
 * @param {string} desiredVal - The value to compare the string property value against.
 * @returns {boolean} - True if the property value matches the desired value, false otherwise.
 * @throws {Error} If the desiredVal is an empty string.
 */
function isStringIntentDetectionValueEqualTo(
	aryResponseObjs: object[],
	intentDetectorId: string,
	propName: string,
	desiredVal: string
): boolean {
	// Validate desiredVal
	if (!desiredVal.trim()) {
		throw new Error('The desired value cannot be empty.');
	}

	// Get the string value or null from the getStringIntentDetectionValue function
	const strValOrNull = getStringIntentDetectionValue(aryResponseObjs, intentDetectorId, propName);

	// If no string value is found, return false
	if (strValOrNull === null) {
		return false;
	}

	// Return whether the found value matches the desired value
	return strValOrNull === desiredVal;
}

// -------------------- END  : INTENT DETECTOR RESULT ARRAY HELPER FUNCTIONS ------------

if (true) {
	// Use an immediate invoked function expression, so that we
//  can await the result.
	(async () => {
		try {
			const dummyUserId = 'the_user';

			// We need a starting chat state.  If we have a
			//  chat history for the user, load it and use
			//  the last (most recent) chat volley object's
			//  ending state.  If not, create a default
			//  chat state object.
			const  chatHistoryObj =
				await readOrCreateChatHistory(dummyUserId)

			const chatState_start =
				chatHistoryObj.getLastVolley()?.chat_state_at_start ?? CurrentChatState.createDefaultObject()

			// Make a clone of the starting chat state so we can
			//  have it as a reference as we make state changes.
			const chatState_current =
				JSON.parse(JSON.stringify(chatState_start));

			// const userInput = 'I want a sign on the wall that screams "Death to all dirty towels!';

			// const userInput = 'I want a sign that the car is not moving!'

			// const userInput = `The image lacks details.  Also, can you make it brighter and why is it taking so long?`;

			// const userInput = "I can't read the letters on the sign and it's a little too bright."

			// const userInput = "I want there to be a sentence on the side of the horse and can you make the images generate faster?"

			const userInput = "No I said I wanted the deer to be bright yellow, not blue and why is the image out of focus and too dark?  Also, I want the deer to be looking at the camera.  Also, the image is really unimaginative.";

			/*
			const result =
				await executeIntentCompletion(
					enumIntentDetectorId.IS_TEXT_WANTED_ON_IMAGE,
					g_TextCompletionParamsForIntentDetector,
					userInput)

			console.info(`${errPrefix}result object:`);
			console.dir(result, {depth: null, colors: true});
			 */

			// -------------------- BEGIN: INTENT DETECTOR PRE-STEP ------------

			const bDoIntents = true;

			// This array will accumulate the text we should
			//  add to the response to the user, that describe
			//  what changes we made to the chat session state.
			const aryChangeDescriptions = [];

			// The array of intent detector JSON response objects
			//  will be put here.
			let aryIntentDetectorJsonResponseObjs = [];

			if (bDoIntents) {

				// Run the user input by all intents.
				const aryIntentDetectResultObjs =
					await processAllIntents(
						Object.values(enumIntentDetectorId),
						g_TextCompletionParamsForIntentDetector,
						userInput)

				// Dump the user input to the console.
				console.info(CONSOLE_CATEGORY, `UserInput:\n\n${userInput}\n\n`)

				// Dump the results to the console.
				showIntentResultObjects(aryIntentDetectResultObjs);

				// If any of the results errored out, for now, we throw
				//  an error.
				//
				// TODO: Add recovery or mitigation code instead.
				if (aryIntentDetectResultObjs.some(
					(intentResultObj) =>
						intentResultObj.is_error !== true
				)) {
					throw new Error(`${errPrefix}One or more of the intent detector calls failed.`)
				}

				// Create an array of the intent detector JSON response
				//  objects.
				aryIntentDetectorJsonResponseObjs =
					aryIntentDetectResultObjs.map(
						(intentResultObj) => {
							// Merge the intent detector ID into the
							//  JSON response object.
							const jsonResponseObj =
								intentResultObj.result_or_error.json_response;
							jsonResponseObj.intent_detector_id = intentResultObj.result_or_error.intent_detector_id

							return jsonResponseObj
						}
					)

				if (aryIntentDetectorJsonResponseObjs.length < 1)
					throw new Error(`${errPrefix}The array of intent detectors JSON response objects is empty.`);

				// -------------------- BEGIN: INTENT DETECTIONS TO STATE CHANGES ------------

				// Now we examine the JSON response objects received from
				//  the intent detections to see if we should make any
				//  state changes.

				// >>>>> Text on image wanted?
				const bIsTextOnImageDesired =
					getBooleanIntentDetectionValue(
						aryIntentDetectorJsonResponseObjs,
						enumIntentDetectorId.IS_TEXT_WANTED_ON_IMAGE,
						'is_text_wanted_on_image'
						);

				if (bIsTextOnImageDesired) {
					// Switch to the FLUX model since it is
					//  much better for text on images.
					chatState_current.model_id =
						enumImageGenerationModelId.FLUX

					aryChangeDescriptions.push(
						`I will use an engine that is good at creating text on images.`
					)
				} else {
					// We don't switch away from flux to
					//  another model just because the
					//  user did not indicate they want
					//  text on images this volley.  This
					//  may be a continuation of a current
					//  text on image generation session.
				}

				// >>>>> Blurry image or lack of detail?
				const bIsImageBlurry =
					isStringIntentDetectionValueEqualTo(
						aryIntentDetectorJsonResponseObjs,
						enumIntentDetectorId.USER_COMPLAINT_IMAGE_QUALITY_OR_WRONG_CONTENT,
						'complaint_type',
						'blurry'
					);

				if (bIsImageBlurry) {
					// TODO: There should be an upper limit here.

					// Increase the number of steps used.
					chatState_current.steps += NUM_STEPS_ADJUSTMENT_VALUE;

					aryChangeDescriptions.push(
						`I have increased the time spent on image generation to make the image look better.`)
				}

				// >>>>> Image generation too slow?
				const bIsImageGenerationTooSlow =
					isStringIntentDetectionValueEqualTo(
						aryIntentDetectorJsonResponseObjs,
						enumIntentDetectorId.USER_COMPLAINT_IMAGE_GENERATION_SPEED,
						'complaint_type',
						'generate_image_too_slow'
					);

				if (bIsImageGenerationTooSlow) {
					// Decrease the number of steps used.
					chatState_current.step -= NUM_STEPS_ADJUSTMENT_VALUE

					if (chatState_current.steps < MIN_STEPS)
						chatState_current.steps = MIN_STEPS;

					aryChangeDescriptions.push(
						`I have increased the time spent on image generation to make the image look better.`)
				}

				// >>>>> User wants less variation, usually
				//  via a "wrong_content" complaint
				const bIsWrongContent =
					isStringIntentDetectionValueEqualTo(
						aryIntentDetectorJsonResponseObjs,
						enumIntentDetectorId.USER_COMPLAINT_IMAGE_QUALITY_OR_WRONG_CONTENT,
						'complaint_type',
						'wrong_content'
					);

				if (bIsWrongContent) {
					// TODO: There should be an upper limit here.

					// Increase the guidance value.
					chatState_current.guidance_scale += NUM_GUIDANCE_SCALE_ADJUSTMENT_VALUE

					aryChangeDescriptions.push(
						`I have told the engine to be less creative.`)
				}

				// >>>>> User wants more variation
				const bIsImageBoring =
					isStringIntentDetectionValueEqualTo(
						aryIntentDetectorJsonResponseObjs,
						enumIntentDetectorId.USER_COMPLAINT_IMAGE_IS_BORING,
						'complaint_type',
						'boring'
					);

				if (bIsImageBoring) {
					// Decrease the guidance value.
					chatState_current.guidance_scale -= NUM_GUIDANCE_SCALE_ADJUSTMENT_VALUE

					if (chatState_current.steps < MIN_STEPS)
						chatState_current.steps = MIN_STEPS;

					aryChangeDescriptions.push(
						`I have told the engine to be more creative.`)
				}

				// -------------------- END  : INTENT DETECTIONS TO STATE CHANGES ------------
			}

			// -------------------- END  : INTENT DETECTOR PRE-STEP ------------

			// -------------------- BEGIN: MAIN IMAGE GENERATOR PROMPT STEP ------------

			console.info(CONSOLE_CATEGORY, `----------------------- MAIN LLM INTERACTION ---------------\n\n`)

			// Now we need to get help from the LLM on creating or refining
			//  a good prompt for the user.
			const initialImageGenPrompt =
				buildChatBotSystemPrompt(userInput, chatHistoryObj)

			const textCompletion =
				await chatCompletionImmediate(
					'MAIN-IMAGE-GENERATION-PROMPT',
					initialImageGenPrompt,
					userInput,
					g_TextCompletionParams,
					true);

			// Type assertion to include 'revised_image_prompt'
			const jsonResponse = textCompletion.json_response as ImageGeneratorLlmJsonResponse;

			const revisedImageGenPrompt = jsonResponse.prompt;

			if (revisedImageGenPrompt === null || revisedImageGenPrompt.length < 1)
				throw new Error(`The revised image generation prompt is invalid or empty.`);

			// The negative prompt may be empty.
			const revisedImageGenNegativePrompt =
				jsonResponse.negative_prompt ?? '';

			const aryImageUrls =
				await generateImages_chat_bot(
					revisedImageGenPrompt,
					jsonResponse.negative_prompt,
					chatState_current)

			// Generate the HTML
			const htmlContent = generateHTML(aryImageUrls);

			// Define the output file path
			const outputPath = path.join('C:', 'temp', 'image-gen-out.html');

			// Write the HTML to the file
			fs.writeFile(outputPath, htmlContent, 'utf8', (err) => {
				if (err) {
					console.error('Error writing file:', err);
				} else {
					console.log('HTML file successfully created at:', outputPath);
				}
			});

			// -------------------- END  : MAIN IMAGE GENERATOR PROMPT STEP ------------

			// -------------------- BEGIN: CREATE RESPONSE FOR USER ------------

			// We build a response to be shown to the user by the
			//  client using what we have so far.
			// Build the response we send to the user.  We show
			//  them the prompt the LLM gave us that we sent
			//  to the image generation model, and the
			//  text we assembled to tell the user what we
			//  did in response to feedback they gave us
			//  about the last image generation.

			let responseSentToClient: string =
				`Here is the new image request we just made:\n${revisedImageGenPrompt}\n`

			if (aryChangeDescriptions.length > 0)
				responseSentToClient +=
					`and the changes I made to improve the result:\n\n${aryChangeDescriptions.join(' ')}\n`

			responseSentToClient += `Let's see how this one turns out`

			// -------------------- END  : CREATE RESPONSE FOR USER ------------

			// -------------------- BEGIN: UPDATE CHAT HISTORY ------------

			const newChatVolleyObj =
				new ChatVolley(
					false,
					null,
					userInput,
					revisedImageGenPrompt,
					revisedImageGenNegativePrompt,
					textCompletion,
					responseSentToClient,
					chatState_start,
					chatState_current,
					aryIntentDetectorJsonResponseObjs,
				)

			chatHistoryObj.addChatVolley(newChatVolleyObj)

			// Update storage.
			await writeChatHistory(dummyUserId, chatHistoryObj)

			// -------------------- END  : UPDATE CHAT HISTORY ------------

			// -------------------- BEGIN: MOCK CLIENT RESPONSE ------------

			// Here we emulate what we would do if this was not
			//  the test harness but instead, we were handling
			//  a client websocket request.

			console.info(CONSOLE_CATEGORY, `SIMULATED CLIENT RESPONSE:\n${responseSentToClient}`)

			// -------------------- END  : MOCK CLIENT RESPONSE ------------
			// Initialize the state flags to make extractOpenAiResponseDetails()
			//  happy.
			const state = {
				streaming_audio: false,
				streaming_text: false,
				waiting_for_images: false,
				current_request_id: "",
			};

			// console.info(CONSOLE_CATEGORY, `JSON response received:\n${result.json_response}`)
			// console.info(CONSOLE_CATEGORY, `Done`)
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