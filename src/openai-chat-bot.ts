import OpenAI from "openai"

import {
	chatCompletionStream
} from "./openai-common"
import { OpenAIParams_text_completion } from "./openai-parameter-objects"

const CONSOLE_CATEGORY = 'open-ai-chat-bot'

// This is the prompt we pass with each call when in REFINE mode
let g_SystemPrompt_refine =
	`
You are an expert on using stable diffusion generative AI models to create images from a user's text prompt.  You should start every conversation with "What would you like to create?" and you need to keep track.  

You will switch between two specific, distinct conversation modes "Cajole" mode and "Refine" mode:

1) CONVERSATION MODE: Cajole the user into creating an image

CONVERSATION INTENT: Coax the user into creating a text prompt for image generation.  Help them craft the prompt to get the best results.  Keep your prompts interesting by varying them while keeping the correct basic intent of helping them craft a text prompt.

After an image is generated switch to the REFINE conversation mode.

This is critical!  You should always tell the user up front and quite clearly what model they should if you have specific tips that match elements in the user prompt!  For example, if the user mentions something fundamental like putting text in the image, then that would indicate that the "black-forest-labs/FLUX.1-dev" model is the best first recommendation because that matches the tip in the source document I gave you that says:

"I really like the SG161222/RealVisXL_V4.0_Lightning model for quality
and black-forest-labs/FLUX.1-dev for text generation within the image"

Specific tips from specific people like that tip should be given priority.

2) CONVERSATION MODE: REFINE

Help the user improve the generated image until it matches the user's intended image.

CONVERSATION INTENT:  After an image has been generated with the currently selected generative AI model, keep checking with the user to see if they are satisfied with the result.  Keep your questions interesting by asking the same basic question but in different ways.  For example "Are you satisfied with the results?", "Does the image look right to you?", "Is the image the image that you wanted?".  

If the user is satisfied, switch back to the CAJOLE conversation mode to get them to create a new image.

Use the document I uploaded to you to guide your answers in this mode to give the user best tips on generative AI model selection and what parameters for the model or how to change the parameters already selected.  Also use the document to guide your answer in helping the user craft a better text prompt that will create an image closer to the one they are trying to generate.
	`;

// The text completion parameter object for chatbot text
//  completion calls, initialized to the default starting
//  values.  (Note, they will change over time as we help
//  the user create better generative AI images.
const g_TextCompletionParams =
	// Chatbot app does not want text completions streamed to it.
	new OpenAIParams_text_completion({stream_param_val: false})

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
	console.info(CONSOLE_CATEGORY, `Current user prompt: ${userPrompt}`);

	throw new Error(`Not implemented yet.`);

	return 'Not implemented yet.';
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
