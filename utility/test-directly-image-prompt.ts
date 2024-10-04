// This test harness exercises the image creation assistant
//  prompt interaction with the LLM.

import {
	createChatBotSystemPrompt, g_TextCompletionParams,
	g_TextCompletionParamsForIntentDetector, processAllIntents, showIntentResultObjects,
} from "../src/openai-chat-bot"
import { enumIntentDetectorId } from "../src/intents/enum-intents"
import { generateImages } from "../src/system/handlers"
import fs from "fs"
import path from "node:path"
import { chatCompletionImmediate } from "../src/openai-common"

const errPrefix: string = '(test-directly-image-prompt) ';
const CONSOLE_CATEGORY = 'test-directly-image-prompt';

// Function to generate HTML content to a temp file for
//  easy viewing of generated images.
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

if (true) {
	// Use an immediate invoked function expression, so that we
//  can await the result.
	(async () => {
		try {
			// const userInput = 'I want a sign on the wall that screams "Death to all dirty towels!';

			// const userInput = 'I want a sign that the car is not moving!'

			// const userInput = `The image lacks details.  Also, can you make it brighter and why is it taking so long?`;

			// const userInput = "I can't read the letters on the sign and it's a little too bright."

			// const userInput = "I want there to be a sentence on the side of the horse and can you make the images generate faster?"

			const userInput = "No I said I wanted the deer to be bright yellow, not blue and why is the image out of focus?  Also, I want the deer to be looking at the camera."

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

			if (bDoIntents) {

				// Run the user input by all intents.
				const aryResultObjs =
					await processAllIntents(
						Object.values(enumIntentDetectorId),
						g_TextCompletionParamsForIntentDetector,
						userInput)

				// Dump the user input to the console.
				console.info(CONSOLE_CATEGORY, `UserInput:\n\n${userInput}\n\n`)

				// Dump the results to the console.
				showIntentResultObjects(aryResultObjs);
			}

			// -------------------- END  : INTENT DETECTOR PRE-STEP ------------

			// -------------------- BEGIN: MAIN IMAGE GENERATOR PROMPT STEP ------------

			console.info(CONSOLE_CATEGORY, `----------------------- MAIN LLM INTERACTION ---------------\n\n`)

			// Now we need to get help from the LLM on creating or refining
			//  a good prompt for the user.
			const initialImageGenPrompt =
				createChatBotSystemPrompt(userInput)

			const textCompletion =
				await chatCompletionImmediate(
					'MAIN-IMAGE-GENERATION-PROMPT',
					initialImageGenPrompt,
					userInput,
					g_TextCompletionParams,
					true);

			// Type assertion to include 'revised_image_prompt'
			const jsonResponse = textCompletion.json_response as { revised_image_prompt: string };

			const revisedImageGenPrompt = jsonResponse.revised_image_prompt;

			if (revisedImageGenPrompt === null || revisedImageGenPrompt.length < 1)
				throw new Error(`The revised image generation prompt is invalid or empty.`);

			const aryImageUrls = await generateImages(revisedImageGenPrompt)

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