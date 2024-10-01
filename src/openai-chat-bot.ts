import { chatCompletionStream } from "./openai-common"
import { OpenAIParams_text_completion } from "./openai-parameter-objects"
import { readTextFileSync } from "./common-routines"
import path from "node:path"
import fs from "fs"

const CONSOLE_CATEGORY = 'open-ai-chat-bot'

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
function readImageGenerationSubPromptOrDie(primaryFileName: string) {
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

// This is the main system prompt uses to generate images.
const g_MainImageGenerationSystemPrompt =
	readTextFileSync('system-prompt-for-image-generation.txt');

// Load the tips we got from Discord memges on generating images.
const g_TipsFromDiscordMembersPrompt =
	readTextFileSync('image-generation-tips-from-discord-members.txt')

// Load the main document we have that contains the main image generation
//  FAQ content.
const g_MainImageGenerationFaqPrompt =
	readTextFileSync('main-image-improvement-tips-and-guidelines-document.txt')

// -------------------- END  : LOAD PROMPT BUILDER TEXT FILES ------------

// The text completion parameter object for chatbot text
//  completion calls, initialized to the default starting
//  values.  (Note, they will change over time as we help
//  the user create better generative AI images).
const g_TextCompletionParams =
	// Chatbot app wants text completions streamed to it.
	new OpenAIParams_text_completion()

/**
 * Given a user prompt and the current image generation parameters,
 *  create a new image generation prompt.
 *
 * @param {String} userPrompt - The current prompt from the user.
 *
 * @return {String} - Returns the system prompt to use in the
 *  upcoming text completion call.
 */
function createChatBotSystemPrompt(userPrompt: string): string {
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
