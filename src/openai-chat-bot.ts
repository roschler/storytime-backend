import { chatCompletionImmediate, chatCompletionStream } from "./openai-common"
import { OpenAIParams_text_completion } from "./openai-parameter-objects"
import { readTextFileSync } from "./common-routines"
import path from "node:path"
import fs from "fs"
import { enumIntentDetectorId, isValidEnumIntentDetectorId } from "./intents/enum-intents"

const CONSOLE_CATEGORY = 'open-ai-chat-bot'

// -------------------- BEGIN: TEXT COMPLETION PARAMETER OBJECTS ------------


// The text completion parameter object for chatbot text
//  completion calls, initialized to the default starting
//  values.  (Note, they will change over time as we help
//  the user create better generative AI images).
export const g_TextCompletionParams =
	// Chatbot app wants text completions streamed to it.
	new OpenAIParams_text_completion();

// The text completion parameters object for intent detector
//  calls.
export const g_TextCompletionParamsForIntentDetector =
	new OpenAIParams_text_completion({
		// Getting 400 unsupported value errors for o1-mini
		// model_param_val: 'o1-mini'
		model_param_val: 'gpt-4-turbo'
	})

// -------------------- END  : TEXT COMPLETION PARAMETER OBJECTS ------------

// -------------------- BEGIN: LOAD PROMPT BUILDER TEXT FILES ------------

// We need to load the system, tips, and perhaps other source files
//  from disk first, since they are used to build the full prompt
//  passed to the LLM, along with the user's input.

const DIR_FOR_IMAGE_GENERATION_PROMPTS = '../prompts-for-text-completions'

/**
 * Load one of our image generation sub-prompt files.  If the
 *  source file can not be found in our directory for those, or
 *  if there is a problem loading it, an error is thrown.
 *
 * @param {String} primaryFileName - The primary file name of the
 *  source file to load.
 *
 * @return {String} Returns the text content found in the source
 *  file.
 */
export function readImageGenerationSubPromptOrDie(primaryFileName: string) {
	// Build the full file path.
	const fullFilePath =
		path.join(DIR_FOR_IMAGE_GENERATION_PROMPTS, primaryFileName)

	if (!fs.existsSync(fullFilePath))
		throw new Error(`Unable to find image generation sub-prompt using file name:\n${primaryFileName}`);

	const textContent = readTextFileSync(fullFilePath);

	if (textContent === null)
		throw new Error(`Unable to load image generation sub-prompt using file name:\n${primaryFileName}`);

	return textContent;
}

// -------------------- BEGIN: INTENT TO PROMPT TEXT MAPPING ------------

// This array maps all the intents we created to the
//  LLM text completion prompt text that is associated
//  with the intent, and the primary name of the
//  resource that has the prompt text.
const g_AryIntentPrompts:
	{ [key: string]:
			{
				primary_resource_name: string,
				prompt_text: string }} = {};

// Assign the correct resource name to each intent.

// >>>>> INTENT: IS_TEXT_WANTED_ON_IMAGE
g_AryIntentPrompts[enumIntentDetectorId.IS_TEXT_WANTED_ON_IMAGE] =
	{
		primary_resource_name: "intent-detector-is-text-wanted-on-image.txt",
		prompt_text: ""
	};

// >>>>> INTENT: USER_COMPLAINT_IMAGE_QUALITY_OR_WRONG_CONTENT
g_AryIntentPrompts[enumIntentDetectorId.USER_COMPLAINT_IMAGE_QUALITY_OR_WRONG_CONTENT] =
	{
		primary_resource_name: "intent-user-complaint-image-quality-or-content.txt",
		prompt_text: ""
	};

// >>>>> INTENT: USER_COMPLAINT_IMAGE_GENERATION_SPEED
g_AryIntentPrompts[enumIntentDetectorId.USER_COMPLAINT_IMAGE_GENERATION_SPEED] =
	{
		primary_resource_name: "intent-user-complaint-image-generation-too-slow.txt",
		prompt_text: ""
	};


// We iterate over all the intent values known to the system
//  at this time to make sure that every one of them has a
//  corresponding prompt resource, and then we load that into
//  our array of intent prompts.
for (const intentId of Object.values(enumIntentDetectorId)) {
	if (typeof g_AryIntentPrompts[intentId] === 'undefined')
		throw new Error(`Unable to find a prompt entry for intent ID: "${intentId}"`);

	const primaryResourceName: string =
		g_AryIntentPrompts[intentId].primary_resource_name;

	if (primaryResourceName.length < 1)
		throw new Error(`The primary resource name is empty for intent ID: "${intentId}"`);

	// Load the prompt text.
	const promptText: string =
		readImageGenerationSubPromptOrDie(primaryResourceName);

	const trimmedPromptText = promptText.trim();

	if (trimmedPromptText.length < 1)
		throw new Error(`The prompt text resource is empty for intent ID: "${intentId}"`);

	// Success.  Store the prompt text.
	g_AryIntentPrompts[intentId].prompt_text = trimmedPromptText;

	console.info(CONSOLE_CATEGORY, `Successfully initialized prompt text for intent ID: "${intentId}"`)
}

/**
 * Execute a text completion call for the desired intent
 *  using the latest input from the user.
 *
 * @param {String} intentId - The ID of the desired intent.
 * @param {OpenAIParams_text_completion} textCompletionParams -
 *  A valid OpenAI text completion parameters object.
 * @param {String} userInput - The latest input from the user.
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
export async function executeIntentCompletion(
		intentId: string,
		textCompletionParams: OpenAIParams_text_completion,
		userInput: string) {

	if (!isValidEnumIntentDetectorId(intentId))
		throw new Error(`Invalid intent ID: "${intentId}"`);

	const trimmedUserInput: string = userInput.trim();

	if (trimmedUserInput.length < 1)
		throw new Error(`The user input is empty`);

	const intentPromptText = g_AryIntentPrompts[intentId].prompt_text.trim();

	if (intentPromptText.length < 1)
		throw new Error(`The intent prompt text is empty`);

	return await chatCompletionImmediate(
		intentId,
		intentPromptText,
		userInput,
		textCompletionParams,
		true)
}

/**
 * Processes multiple intent completions in parallel.
 *
 * @param {string[]} aryIntentIds - An array of intent IDs to be processed.
 * @param {OpenAIParams_text_completion} textCompletionsParams - The parameters to be passed to executeIntentCompletion.
 * @param {string} userInput - The user input that is required for the execution of intents.
 *
 * @returns {Promise<Array<{ is_error: boolean, intent_id: string, result_or_error: any }>>} - Returns an array of objects where each object contains error or success status, the intentId, and the result or error object from the respective execution.
 */
export async function processAllIntents(
	aryIntentIds: string[],
	textCompletionsParams: OpenAIParams_text_completion,
	userInput: string
): Promise<Array<{ is_error: boolean, intent_id: string, result_or_error: any }>> {

	// Validate that aryIntentIds has at least one non-empty element
	if (!Array.isArray(aryIntentIds) || aryIntentIds.length === 0) {
		throw new Error('aryIntentIds must be a non-empty array of intent IDs.');
	}

	// Validate that userInput is not empty after trimming
	if (typeof userInput !== 'string' || userInput.trim().length === 0) {
		throw new Error('userInput must be a non-empty string.');
	}

	// Validate that all intent IDs in aryIntentIds are valid
	const invalidIntents = aryIntentIds.filter(id => !isValidEnumIntentDetectorId(id));
	if (invalidIntents.length > 0) {
		throw new Error(`Invalid intent IDs found: ${invalidIntents.join(', ')}`);
	}

	// Use Promise.all to execute all intents in parallel
	const promises = aryIntentIds.map(async (intentId) => {
		try {
			const result =
				await executeIntentCompletion(
					intentId,
					textCompletionsParams,
					userInput);
			return { is_error: false, intent_id: intentId, result_or_error: result }; // Successful result
		} catch (error) {
			return { is_error: true, intent_id: intentId, result_or_error: error }; // Capture error in the result object
		}
	});

	// Wait for all promises to resolve
	return Promise.all(promises);
}

/**
 * Logs the contents of an array of intent result objects to the console.
 *
 * @param {Array<{ is_error: boolean, intent_id: string, result_or_error: any }>} aryIntentResultObjs -
 * An array of objects representing the intent results. Each object contains the following fields:
 *   - is_error: A boolean indicating if the result is an error.
 *   - intent_id: The ID of the intent.
 *   - result_or_error: The result object or error object associated with the intent.
 *
 * The function will log each object's contents in a pretty-printed format.
 */
export function showIntentResultObjects(
	aryIntentResultObjs: Array<{ is_error: boolean, intent_id: string, result_or_error: any }>
): void {
	aryIntentResultObjs.forEach((obj, index) => {
		console.log(`\nIntent Result Object #${index + 1}:`);
		console.log('Intent ID:', obj.intent_id);
		console.log('Is Error:', obj.is_error);
		console.log('Result or Error:', JSON.stringify(obj.result_or_error, null, 2)); // Pretty-printing the result or error
	});
}

// -------------------- END  : INTENT TO PROMPT TEXT MAPPING ------------

// This is the main system prompt uses to generate images.
export const g_MainImageGenerationSystemPrompt =
	readImageGenerationSubPromptOrDie('system-prompt-for-image-generation-1.txt');

// Load the tips we got from Discord members on generating images.
export const g_TipsFromDiscordMembersPrompt =
	readImageGenerationSubPromptOrDie('image-generation-tips-from-discord-members.txt')

// Load the main document we have that contains the main image generation
//  FAQ content.
export const g_MainImageGenerationFaqPrompt =
	readImageGenerationSubPromptOrDie('main-image-improvement-tips-and-guidelines-document.txt')

// -------------------- END  : LOAD PROMPT BUILDER TEXT FILES ------------

/**
 * Given a user prompt and the current image generation parameters,
 *  create a new image generation prompt.
 *
 * @param {String} userPrompt - The current prompt from the user.
 *
 * @return {String} - Returns the system prompt to use in the
 *  upcoming text completion call.
 */
export function createChatBotSystemPrompt(userPrompt: string): string {
	const useUserPrompt = userPrompt.trim();

	if (useUserPrompt.length < 1)
		throw new Error(`The user prompt is empty.`);

	console.info(CONSOLE_CATEGORY, `Current user prompt: ${userPrompt}`);

	// Build the full prompt from our sub-prompts.
	const arySubPrompts = [];

	arySubPrompts.push(g_MainImageGenerationSystemPrompt)
	arySubPrompts.push(g_TipsFromDiscordMembersPrompt)
	arySubPrompts.push(g_MainImageGenerationFaqPrompt)
	arySubPrompts.push(useUserPrompt)

	return arySubPrompts.join(' ')
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
