// This test harness exercises the image creation assistant
//  prompt interaction with the LLM.

import { assistUserWithImageGeneration } from "../src/openai-chat-bot"

const errPrefix: string = '(test-directly-image-prompt) ';
const CONSOLE_CATEGORY = 'test-directly-image-prompt';

// Use an immediate invoked function expression so we
//  can await the result.
(async () => {
	try {
		const result =
			await assistUserWithImageGeneration('A green frog.')

		console.info(`${errPrefix}result object:`);
		console.dir(result, {depth: null, colors: true});

		console.info(CONSOLE_CATEGORY, `Done`)


	} catch (err) {
		console.info(`${errPrefix}err object:`);
		console.dir(err, {depth: null, colors: true});
	}
})();
