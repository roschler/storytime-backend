import "dotenv/config"

// import type WebSocket from "ws"
import { WebSocket } from 'ws'

import fs, { createWriteStream } from "fs"
import websocket, { SocketStream } from "@fastify/websocket"
import type { FastifyInstance, FastifyRequest } from "fastify"
import { StateType, ErrorType, RequestPayload_chat_bot } from "./system/types"
import {
	sendStateMessage,
	sendErrorMessage,
	sendImageMessage,
	sendTextMessage,
	saveImageURLs,
	saveMetaData_chat_bot
} from "./system/handlers"
import path from "node:path"
import { isFlagged } from "./openai-common"

import { Stream } from 'openai/streaming';
import { ChatCompletionChunk } from "openai/resources/chat/completions"
import { assistUserWithImageGeneration } from "./openai-chat-bot"
import { OpenAIParams_text_completion } from "./openai-parameter-objects"
import { readOrCreateChatHistory } from "./chat-volleys/chat-volleys"

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

// Create a completion stream from OpenAI and pipe it to the client
async function handleImageGenAssistanceRequest(
	client: WebSocket,
	state: StateType,
	payload: { prompt: string, textCompletionParams: OpenAIParams_text_completion, user_id: string },
) {
	// Load the chat history object for this user.
	//  If one has not been created yet, create a
	//  brand new one.
	const chatHistoryObj =
		await readOrCreateChatHistory(payload.user_id)

	const stream =
		await assistUserWithImageGeneration(
			client,
			payload.prompt,
			chatHistoryObj)
	state.streaming_text = false
}

// Request some images from the Livepeer text-to-image API
async function handleImageRequest(
	client: WebSocket,
	state: StateType,
	payload: RequestPayload_chat_bot,
) {

	console.log(`Requesting images:\nprompt -> : ${payload.prompt}`)

	let urls: string[] = []
	// const urls = await generateImages_chat_bot(prompt,)
	throw new Error(`Not implemented yet.`);


	sendImageMessage(client, { urls })
	saveImageURLs(state.current_request_id, urls)
}

/**
 * This is the WebSocket connection handler.
 *
 * @param {SocketStream} connection - The WebSocket
 *  connection this handler services.
 * @param {FastifyRequest} request - The Fastify
 *  request object to process.
 */
async function wsConnection(connection: SocketStream, request: FastifyRequest) {

	// Initialize the state flags.
	const state = {
		streaming_audio: false,
		streaming_text: false,
		waiting_for_images: false,
		current_request_id: "",
	};

	// Use the `connection.socket` instead of `client`
	const client = connection.socket;

	sendStateMessage(client, state);
	console.log(`Client connected: ${request.ip}`);

	// The handler for new messages.
	client.on("message", async (raw) => {
		const message = JSON.parse(raw.toString());
		if (message.type === "request") {
			const { prompt } = message.payload;
			state.current_request_id = `${Date.now()}-${crypto.randomUUID()}`;

			// Check if the prompt is flagged as harmful before
			//  passing the request to AI handlers
			const flagged = await isFlagged(prompt);
			if (flagged) {
				console.log(`User prompt was flagged as harmful: ${prompt}`);

				// Tell the client the prompt was considered harmful
				//  so it can notify the user.
				sendErrorMessage(client, {
					error: badPromptError,
				});
				return; // Exit
			}

			// Submit the request to the LLM to get the image prompt
			//  we should send to Livepeer for image generation purposes.
			//
			// NOTE: We await the call because we need to know what the
			//  prompt for the image generation request is before making
			//  the request to Livepeer.
			await handleImageGenAssistanceRequest(client, state, message.payload);

			// Extract the image generation prompt from the response.
			// const imageGenerationPrompt = extractImageGenerationPrompt(message)
		}
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
