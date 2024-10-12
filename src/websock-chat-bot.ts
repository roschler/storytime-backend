import "dotenv/config"

// import type WebSocket from "ws"
import { WebSocket } from 'ws'

import fs, { createWriteStream } from "fs"
import websocket, { SocketStream } from "@fastify/websocket"
import type { FastifyInstance, FastifyRequest } from "fastify"
import { StateType, } from "./system/types"
import {
	sendStateMessage,
	sendErrorMessage,
	sendTextMessage,
	saveMetaData_chat_bot
} from "./system/handlers"
import path from "node:path"
import { isFlagged } from "./openai-common"

import { Stream } from 'openai/streaming';
import { ChatCompletionChunk } from "openai/resources/chat/completions"
import { OpenAIParams_text_completion } from "./openai-parameter-objects"
import { processChatVolley } from "./process-chat-volley"

// What do we say when the user is trying to be problematic?

const CONSOLE_CATEGORY = 'websocket'
const appName = 'Chatbot'

const badPromptError =
	process.env.HARMFUL_PROMPT_RESPONSE ??
	"I'm sorry, Dave. I'm afraid I can't do that."

// Enable this in the `.env.local` file to stream text to the console

const streamTextToConsole =
	process.env.CONSOLE_STREAM_OUTPUT === "true" ? true : false

/**
 * This function extracts the suggested image generation prompt
 *  from the LLM Chatbot.
 *
 * @param {Object} payload - The payload field from the LLM
 *  response object.
 *
 * @return {String} - Returns the suggested image generation
 *  prompt.
 */
function extractImageGenerationPrompt(payload: any): string {
	if (typeof payload !== 'object' || payload === null)
		throw new Error(`The "message" parameter does not contain a valid object.`)

	// TODO: Put the real code here!
	return 'A frog wearing a hat.'
}

/**
 * Given an OpenAI streaming response, extract out the
 *  content we need contained in it.
 *
 * @param {StateType} state - The current state.
 * @param {Stream} stream - The OpenAI stream associated
 *  with the response.
 * @param {WebSocket|null} client - The client websocket we
 *  are servicing if we are in server mode, or NULL, if
 *  we are in stand-alone utility mode.
 * @param {Object<prompt, OpenAIParams_text_completion>} payload -
 *  The payload object received.
 *
 * @return {Object} - Returns an object containing the content
 *  we need from the streaming OpenAI text completions response.
 */
export async function extractOpenAiResponseDetails(state: StateType, stream: Stream<ChatCompletionChunk>, client: WebSocket | null, payload: {
	prompt: string;
	textCompletionParams: OpenAIParams_text_completion
}) {

	if (client === null) {
		// Handle the null case if needed
	} else if (!(client instanceof WebSocket)) {
		throw new Error(`The value in the client parameter is not NULL, so it must be a WebSocket object and it is not.`);
	}

	const fileName = state.current_request_id
	const fullFileName = fileName + ".txt"
	const fullOutputFilename =
		process.cwd() + "/output/text/" + fullFileName
	const dir = path.dirname(fullOutputFilename)

	console.info(CONSOLE_CATEGORY, `Writing text output to:\n${fullOutputFilename}`)

	// Ensure the directory exists
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true })
	}

	const localFile = createWriteStream(
		fullOutputFilename,
		{
			encoding: "utf-8",
		},
	)

	// Here we are streaming the output of the OpenAI completion to the client
	//  over the WebSocket connection as well as to the local filestream we
	//  created above. This will change in a future version to use Firestream
	const aryTextElements = []

	for await (const chunk of stream) {
		const text = chunk.choices[0]?.delta?.content || ""
		const stop = chunk.choices[0]?.finish_reason

		// Do not send a message to the client if we don't have
		//  a valid WebSocket instance.  It could be a stand-alone
		//  utility calling us.
		if (text !== null) {
			const newContent = chunk.choices[0]?.delta?.content;

			if (newContent)
				aryTextElements.push(newContent);

			if (client === null) {
				// No client connection.  Do nothing.
			} else {
				// Pass the chunk on to the client.
				sendTextMessage(client, { delta: text })
				localFile.write(text)
			}

			if (streamTextToConsole === true) {
				process.stdout.write(chunk.choices[0]?.delta?.content || "")
			}
		}

		// When OpenAI gives us a stop signal, we wrap up the filestream
		// and send a state message to the client so they know to update their UI.
		// If you see the reason "length" in the console, it means the stream
		// was stopped because the maximum token length was reached.
		// This limitation is set by `OPENAI_MAX_TOKENS` in the .env file
		// if you'd like to increase it, but be aware that GPT-4 in
		// particular can get very expensive very quickly!
		if (stop) {
			// -------------------- BEGIN: LLM OUTPUT RECEIVED, MAKE IMAGE GENERATION REQUEST ------------

			// TODO: Check the "stop" value for failure codes and take
			//  appropriate actions.

			// Now that we have gotten the entire response from the LLM,
			//  extract the image generation prompt and pass it on to the
			//  Livepeer network.
			console.info(CONSOLE_CATEGORY, `LLM response received.`)

			state.streaming_text = false

			// Do not send a message to the client if we don't have
			//  a valid WebSocket instance.  It could be a stand-alone
			//  utility calling us.
			if (client == null) {
				// No client connect.  Do nothing.
			} else {
				// Notify the client side front-end that we have received
				//  the entire LLM response.
				sendStateMessage(client, state)

				localFile.end()

				// Save the meta-data for the session.
				saveMetaData_chat_bot(fileName, payload)
				console.log(`${appName}: Stream from OpenAI stopped with reason: ${stop}`)

				// Extract the image generation prompt from the LLM result.

				// -------------------- END  : LLM OUTPUT RECEIVED, MAKE IMAGE GENERATION REQUEST ------------
			}
		}
	}

	// Time to return our aggregated result.
	const allTextElements =
		aryTextElements.join(' ');

	return allTextElements;
}

/**
 * This is the WebSocket connection handler.
 *
 * @param {SocketStream} connection - The WebSocket
 *  connection this handler services.
 * @param {FastifyRequest} request - The Fastify
 *  request object to process.
 */
async function wsConnection(
		connection: SocketStream,
		request: FastifyRequest) {

	// Initialize the state flags.
	const initialState = {
		streaming_audio: false,
		streaming_text: false,
		waiting_for_images: false,
		current_request_id: "",
		state_change_message: ""
	};

	// Use the `connection.socket` instead of `client`
	const client = connection.socket;

	sendStateMessage(client, initialState);
	console.log(`Client connected: ${request.ip}`);

	// The handler for new messages.
	client.on("message", async (raw) => {
		try {
			// Parse out the JSON message object.
			const message = JSON.parse(raw.toString());

			// Is it a request message?
			if (message.type === "request") {
				// Yes.  Process a chat volley.
				//
				// Every request must have a user ID and user input fields.
				const { user_id, prompt } = message.payload;

				if (!user_id || user_id.trim().length < 1)
					throw new Error(`BAD REQUEST: User ID is missing.`);

				if (!prompt || prompt.trim().length < 1)
					throw new Error(`BAD REQUEST: User input is missing.`);

				// Create a unique request ID.
				initialState.current_request_id = `${Date.now()}-${crypto.randomUUID()}`;

				// Check if the prompt is flagged as harmful before
				//  passing the request to AI handlers
				const flagged = await isFlagged(prompt);
				if (flagged) {
					console.log(`User prompt was flagged as harmful: ${prompt}`);

					// Tell the client the prompt was considered harmful
					//  so that it can notify the user.
					sendErrorMessage(client, {
						error: badPromptError,
					});

					return false; // Exit
				}

				// Submit the request to the LLM to get the image prompt
				//  we should send to Livepeer for image generation purposes.
				const isChatVolleySuccessful =
					await processChatVolley(client, initialState, user_id, prompt)

				// await handleImageGenAssistanceRequest(client, state, message.payload);

				// Extract the image generation prompt from the response.
				// const imageGenerationPrompt = extractImageGenerationPrompt(message)

				return isChatVolleySuccessful
			} else {
				throw new Error(`BAD REQUEST: Unknown message type -> ${message.type}.`);
			}
		} catch (err) {
			const errMsg =
				`Failure during chat volley processing.  Details: ${err.message}`

			sendErrorMessage(client, { error: errMsg})

			console.error(err);

			return false
		}
	});

	// The handler for when the WebSocket closes.
	client.on('close', (code, reason) => {
		console.log('***** Client disconnected *****');
		console.log(`Close code: ${code}`);
		console.log(`Close reason: ${reason.toString()}`);
	});


	// The handler for when an error occurs.
	client.on('error', (err) => {
		console.error('----->>>>> WebSocket error:', err);
	});
}

/**
 * This is the WebSocket controller for the image generation
 *  assistant chat-bot app.
 *
 * @param {FastifyInstance} fastify - A valid Fastify
 *  instance.
 */
export default async function wsControllerForChatBot(fastify: FastifyInstance) {
	await fastify.register(websocket)
	fastify.get("/chatbot", { websocket: true }, wsConnection)
}
