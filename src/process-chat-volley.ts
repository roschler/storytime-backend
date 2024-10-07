// This module includes code for processing a chat volley.

import type WebSocket from "ws"
import { ChatVolley, CurrentChatState, readChatHistory, writeChatHistory } from "./chat-volleys/chat-volleys"
import { enumImageGenerationModelId, IntentJsonResponseObject } from "./enum-image-generation-models"
import {
	buildChatBotSystemPrompt, g_TextCompletionParams,
	g_TextCompletionParamsForIntentDetector,
	processAllIntents,
	showIntentResultObjects,
} from "./openai-chat-bot"
import {
	enumIntentDetectorId,
	MIN_STEPS,
	NUM_GUIDANCE_SCALE_ADJUSTMENT_VALUE,
	NUM_STEPS_ADJUSTMENT_VALUE,
} from "./intents/enum-intents"
import { chatCompletionImmediate } from "./openai-common"
import { ImageGeneratorLlmJsonResponse } from "./openai-parameter-objects"
import { generateImages_chat_bot, sendImageMessage, sendStateMessage, sendTextMessage } from "./system/handlers"
import { StateType, TextType } from "./system/types"

const CONSOLE_CATEGORY = 'process-chat-volley'

// -------------------- BEGIN: HELPER FUNCTIONS ------------

// -------------------- BEGIN: INTENT DETECTOR RESULT ARRAY HELPER FUNCTIONS ------------

/**
 * Validates the boolean value for a given intent detector id and property name from an array of response objects.
 *
 * @param aryJsonResponseObjs - The array of intent detector JSON response objects to iterate over.
 * @param intentDetectorId - The intent detector ID to search for.
 * @param propName - The property name to check within the matching object.
 */
function getBooleanIntentDetectionValue(
	aryJsonResponseObjs: IntentJsonResponseObject[],
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

	let retValue: boolean | null = null

	// Iterate over the extended JSON response objects
	for (const jsonResponseObjExt of aryJsonResponseObjs) {

		// Check if the object's intent_detector_id matches the provided intentDetectorId
		if (jsonResponseObjExt.intent_detector_id === intentDetectorId) {

			// Iterate its child objects and look for a child object
			//  with the desired property name.
			jsonResponseObjExt.array_child_objects.forEach(
				(childObj) => {
					// Does the child object have a property with the desired
					//  name?
					const propValue = (childObj as any)[propName]

					if (typeof propValue !== 'undefined') {
						// Check if the value is boolean
						if (typeof propValue !== 'boolean') {
							throw new Error(`The property '${propName}' in the child object with intent_detector_id '${intentDetectorId}' is not boolean.`);
						}
					}

					// Found it.  We add the functionally unnecessary
					//  because Typescript is not figuring out due
					//  to the "undefined" check above, that propValue
					//  must be boolean at this point.
					retValue =
						typeof propValue === 'undefined'
							? null : propValue
				}
			)
		}
	}

	// If no object with the matching intentDetectorId is found,
	//  return NULL to let the caller know this.
	return retValue;
}

/**
 * Retrieves the string value for a given intent detector id and property name from an array of response objects.
 *
 * @param aryJsonResponseObjs - The array of JSON response objects to iterate over.
 * @param intentDetectorId - The intent detector ID to search for.
 * @param propName - The property name to check within the matching object.

 * @returns {string | null} - The string value found in the object for the given intent detector ID and property, or null if no match is found.
 */
function getStringIntentDetectionValue(
	aryJsonResponseObjs: IntentJsonResponseObject[],
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

	let retValue: string | null

	// Iterate over the extended JSON response objects
	for (const jsonResponseObjExt of aryJsonResponseObjs) {

		// Check if the object's intent_detector_id matches the provided intentDetectorId
		if (jsonResponseObjExt.intent_detector_id === intentDetectorId) {

			// Iterate its child objects and look for a child object
			//  with the desired property name.
			jsonResponseObjExt.array_child_objects.forEach(
				(childObj) => {
					// Does the child object have a property with the desired
					//  name?
					const propValue = (childObj as any)[propName]

					if (typeof propValue !== 'undefined') {
						// Check if the value is a string
						if (typeof propValue !== 'string') {
							throw new Error(`The property '${propName}' in the child object with intent_detector_id '${intentDetectorId}' is not a string.`);
						}
					}

					// Found it.  We add the functionally unnecessary
					//  because Typescript is not figuring out due
					//  to the "undefined" check above, that propValue
					//  must be a string at this point.
					retValue =
						typeof propValue === 'undefined'
							? null : propValue
				}
			)
		}
	}

	// If no object with the matching intentDetectorId is found,
	//  return NULL to let the caller know this.
	return null;
}

/**
 * Searches the array of JSON response objects for a JSON response
 * object that has the desired property name and the desired
 * property value to match.
 *
 * @param aryJsonResponseObjs - The array of JSON response objects to iterate over.
 * @param intentDetectorId - The intent detector ID to search for.
 * @param propName - The property name to check within the matching object.
 * @param desiredPropValue - The value we want to match for the property with
 *  the desire property name.

 * @returns {boolean} - Returns TRUE if a JSON response object has a child
 *  object with the desired property name and matching property value.
 *  FALSE if not.
 */
function isStringIntentDetectedWithMatchingValue(
	aryJsonResponseObjs: IntentJsonResponseObject[],
	intentDetectorId: string,
	propName: string,
	desiredPropValue: string
): boolean {
	// Validate intentDetectorId
	if (!intentDetectorId.trim()) {
		throw new Error('The intentDetectorId cannot be empty.');
	}

	// Validate propName
	if (!propName.trim()) {
		throw new Error('The propName cannot be empty.');
	}

	let retValue = false

	// Iterate over the extended JSON response objects
	for (const jsonResponseObjExt of aryJsonResponseObjs) {
		// Check if the object's intent_detector_id matches the provided intentDetectorId
		if (jsonResponseObjExt.intent_detector_id === intentDetectorId) {
			// Iterate its child objects and look for a child object
			//  with the desired property name.
			retValue =
				jsonResponseObjExt.array_child_objects.some(
					(childObj) => {
						// Does the child object have a property with the desired
						//  name?
						const propValue = (childObj as any)[propName]

						if (typeof propValue !== 'undefined') {
							// Check if the value is a string
							if (typeof propValue !== 'string') {
								throw new Error(`The property '${propName}' in the child object with intent_detector_id '${intentDetectorId}' is not a string.`);
							}
						}

						// Does it match the desired value?
						return propValue === desiredPropValue
					}
				)
		}
	}

	// If no object with the matching intentDetectorId is found,
	//  return NULL to let the caller know this.
	return retValue
}

// -------------------- END  : HELPER FUNCTIONS ------------

// -------------------- BEGIN: MAIN FUNCTION ------------

/**
 * This function processes one chat volley for the given
 *  user.
 *
 * @param client - The client WebSocket connection we are
 *  servicing.  Pass NULL if this call is being made from
 *  a test harness.
 * @param initialState - The initial state of the session
 *  at the top of this call, before we (may) alter it
 * @param userId_in - The ID of the current user.
 * @param userInput_in - The latest input from that user.
 *
 * @return - Returns the array of images generated if
 *  successful, throws an error if not.
 */
export async function processChatVolley(
		client: WebSocket | null,
		initialState: StateType,
		userId_in: string,
		userInput_in: string): Promise<string[]> {

	const userId = userId_in.trim()

	if (userId.length < 1)
		throw new Error(`The user ID is empty or invalid.`);

	const userInput = userInput_in.trim()

	if (userInput.length < 1)
		throw new Error(`The user input is empty or invalid.`);

	// We need a starting chat state. If we have a
	//  chat history for the user, load it and use
	//  the last (most recent) chat volley object's
	//  ending state.  If not, create a default
	//  chat state object.
	const  chatHistoryObj =
		await readChatHistory(userId)

	const chatState_start =
		chatHistoryObj.getLastVolley()?.chat_state_at_start ?? CurrentChatState.createDefaultObject()

	// Make a clone of the starting chat state so that we can
	//  have it as a reference as we make state changes.
	const chatState_current =
		chatState_start.clone()

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
	const aryIntentDetectorJsonResponseObjs: IntentJsonResponseObject[] = [] ;

	if (bDoIntents) {
		// >>>>> Status message: Tell the client we are thinking as
		//  we make the intent detector calls.
		if (client) {
			let newState = initialState

			// We haven't started the image request yet but
			//  overall, we are indeed waiting for images.
			newState.waiting_for_images = true
			newState.state_change_message = 'Thinking...'

			sendStateMessage(client, newState)
		}

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
				intentResultObj.is_error === true
		)) {
			throw new Error(`$One or more of the intent detector calls failed.`)
		}

		// Create an array of the intent detector JSON response
		//  objects.
		aryIntentDetectResultObjs.forEach(
			(intentResultObj) => {
				// Merge the intent detector ID into the
				//  JSON response object.
				const jsonResponseObj = {
					intent_detector_id:  intentResultObj.result_or_error.intent_detector_id,
					array_child_objects: intentResultObj.result_or_error.json_response
				}

				aryIntentDetectorJsonResponseObjs.push(jsonResponseObj)
			}
		)

		if (aryIntentDetectorJsonResponseObjs.length < 1)
			throw new Error(`The array of intent detectors JSON response objects is empty.`);

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
			isStringIntentDetectedWithMatchingValue(
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
			isStringIntentDetectedWithMatchingValue(
				aryIntentDetectorJsonResponseObjs,
				enumIntentDetectorId.USER_COMPLAINT_IMAGE_GENERATION_SPEED,
				'complaint_type',
				'generate_image_too_slow'
			);

		if (bIsImageGenerationTooSlow) {
			// Decrease the number of steps used.
			chatState_current.steps -= NUM_STEPS_ADJUSTMENT_VALUE

			if (chatState_current.steps < MIN_STEPS)
				chatState_current.steps = MIN_STEPS;

			aryChangeDescriptions.push(
				`I have increased the time spent on image generation to make the image look better.`)
		}

		// -------------------- BEGIN: VARIATION UP/DOWN TRIAGE ------------

		// If the user reports wrong content at the same time the
		//  want more variation, the two opposing adjustments to
		//  guidance_scale will conflict.  Therefore, we check for
		//  those two intent detections together, before taking
		//  action on them.

		// >>>>> Check for the user wanting less variation, usually
		//  via a "wrong_content" complaint
		const bIsWrongContent =
			isStringIntentDetectedWithMatchingValue(
				aryIntentDetectorJsonResponseObjs,
				enumIntentDetectorId.USER_COMPLAINT_IMAGE_QUALITY_OR_WRONG_CONTENT,
				'complaint_type',
				'wrong_content'
			);

		// >>>>> Check for the user wanting more variation
		const bIsImageBoring =
			isStringIntentDetectedWithMatchingValue(
				aryIntentDetectorJsonResponseObjs,
				enumIntentDetectorId.USER_COMPLAINT_IMAGE_QUALITY_OR_WRONG_CONTENT,
				'complaint_type',
				'boring'
			);

		// We favor the wrong content complaint over the image is
		//  boring complaint.
		if (bIsWrongContent) {
			// TODO: There should be an upper limit here.

			// Increase the guidance value.
			chatState_current.guidance_scale += NUM_GUIDANCE_SCALE_ADJUSTMENT_VALUE

			let changeDescription =
				`I have told the engine to be less creative.`

			// If we also have a boring image complaint, modify the change
			//  description to tell the user that we will concentrate on
			//  getting the image content correct first.
			if (bIsImageBoring)
				changeDescription += ` Let's concentrate on getting the image content correct before trying to be more creative.`

			aryChangeDescriptions.push(changeDescription)
		} else if (bIsImageBoring) {
			// Decrease the guidance value.
			chatState_current.guidance_scale -= NUM_GUIDANCE_SCALE_ADJUSTMENT_VALUE

			if (chatState_current.steps < MIN_STEPS)
				chatState_current.steps = MIN_STEPS;

			aryChangeDescriptions.push(
				`I have told the engine to be more creative.`)
		}

		// -------------------- END  : VARIATION UP/DOWN TRIAGE ------------

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
		`Here is the new image request we just made:\n\n"${revisedImageGenPrompt}"\n`

	if (aryChangeDescriptions.length > 0)
		responseSentToClient +=
			`and the changes I made to improve the result:\n\n${aryChangeDescriptions.join(' ')}\n`

	responseSentToClient += `\nLet's see how this one turns out`

	// Now send the response message to the client while we make
	//  the image generation request.
	//
	// >>>>> Status message: Tell the client we have made the
	//  image request
	if (client) {
		let newState = initialState

		// Make sure the "waiting for images" state is set
		newState.waiting_for_images = false
		newState.state_change_message = 'Requesting image from Livepeer...'

		sendStateMessage(
			client,
			newState
		)
		sendTextMessage(
				client,
			{
				delta: responseSentToClient
			}
		)


	}

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
	await writeChatHistory(userId, chatHistoryObj)

	// -------------------- END  : UPDATE CHAT HISTORY ------------

	// -------------------- BEGIN: MAKE IMAGE REQUEST ------------

	const aryImageUrls =
		// https://dream-gateway.livepeer.cloud/text-to-image
		await generateImages_chat_bot(
			revisedImageGenPrompt,
			jsonResponse.negative_prompt,
			chatState_current)

	// -------------------- END  : MAKE IMAGE REQUEST ------------

	// -------------------- BEGIN: SEND IMAGE RESULT TO CLIENT ------------

	console.info(CONSOLE_CATEGORY, `SIMULATED CLIENT RESPONSE:\n${responseSentToClient}`)

	if (client) {
		let newState = initialState

		sendImageMessage(client, { urls: aryImageUrls})

		// Make sure the "waiting for images" state is set
		newState.waiting_for_images = false
		newState.state_change_message = ''

		sendStateMessage(client, newState)
	}

	// -------------------- END  : SEND IMAGE RESULT TO CLIENT ------------

	// Clear flags.
	const state = {
		streaming_audio: false,
		streaming_text: false,
		waiting_for_images: false,
		current_request_id: "",
	};

	return aryImageUrls
}

// -------------------- END  : MAIN FUNCTION ------------
