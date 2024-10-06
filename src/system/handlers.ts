import type WebSocket from "ws"
import fs, { createWriteStream } from "fs"
import {
	LivepeerImage,
	ImageType,
	StateType,
	ErrorType,
	TextType,
	Genre,
} from "./types"
import path from "node:path"
import { OpenAIParams_text_completion } from "../openai-parameter-objects"
import { CurrentChatState } from "../chat-volleys/chat-volleys"
import { StatusCodes } from 'http-status-codes';

// Pull in all of our environment variables
// and set defaults if any of them are missing
const livepeer_sd_gateway =
	process.env.LIVEPEER_SD_GATEWAY_HOST ?? "dream-gateway.livepeer.cloud"
const model_id = process.env.LIVEPEER_SD_MODEL_ID ?? "ByteDance/SDXL-Lightning"
const negative_prompt = process.env.LIVEPEER_SD_NEGATIVE_PROMPT ?? undefined
const image_size = Number(process.env.LIVEPEER_SD_IMAGE_SIZE ?? "1024")
const guidance_scale = Number(process.env.LIVEPEER_SD_GUIDANCE ?? "15")
const num_images = Number(process.env.LIVEPEER_SD_IMAGE_COUNT ?? "2")

const livePeerRequestOptions = {
	method: "POST",
	headers: {
		"Content-Type": "application/json",
		Authorization: `Bearer ${process.env.LIVEPEER_API_KEY}`,
	},
}

/**
 * Make an image generation request against the Livepeer service
 *  for the Storytime app.
 *
 * @param {String} prompt - The prompt to pass to the Livepeer
 *  image generation API.
 *
 * @return {Promise<*>}
 */
export const generateImages_storytime = async (prompt: string): Promise<any> => {
	let urls
	const body = {
		prompt,
		model_id,
		guidance_scale,
		negative_prompt,
		width: image_size,
		height: image_size,
		num_images_per_prompt: num_images,
	}
	const request = await _request({
		...livePeerRequestOptions,
		body: JSON.stringify(body),
	})

	const { images } = await request.json()
	if (!images || images.length === 0) {
		throw new Error("No images returned from Livepeer")
	}

	try {
		urls = images.map((image: LivepeerImage) => {
			return image.url
		})
	} catch (e) {
		console.error("Error parsing image URLs", e)
	}
	return urls
}

/**
 * Make an image generation request against the Livepeer service
 *  for the Chatbot app.
 *
 * @param prompt - The prompt to pass to the image generator model.
 * @param negative_prompt - The negative prompt to pass to the image generator model.
 * @param chatStateObj - The current state of the
 *  chat session.
 *
 * @return {Promise<*>}
 */
export const generateImages_chat_bot =
	async (
		prompt: string,
		negative_prompt: string,
		chatStateObj: CurrentChatState): Promise<any> => {

	let urls

	let x= negative_prompt

	const body = {
		prompt: prompt,
		model_id: chatStateObj.model_id,
		// Including the loras field causes 400 Bad Request error at the current time
		// loras: chatStateObj.loras,
		// loras: {},
		lora_models: {},
		guidance_scale: chatStateObj.guidance_scale,
		negative_prompt: negative_prompt,
		width: image_size,
		height: image_size,
		num_images_per_prompt: num_images,
	}
	const request = await _request({
		...livePeerRequestOptions,
		body: JSON.stringify(body),
	})

	if (request.status !== StatusCodes.OK) {
		/**
		 * Remember, the Livepeer network returns a 503 service
		 *  unavailable error if you pass in an invalid model ID.
		 *  It does not mean (necessarily) that Livepeer is down.
		 */
		// The request failed.  Show the status text and throw an error.
		const errMsg =
			`(generateImages_chat_bot) The image request failed with status code(${request.status}) and this status text: ${request.statusText}\nService URL: ${request.url}`

		console.error(errMsg)

		throw new Error(errMsg);
	}

	const { images } = await request.json()
		if (!images || images.length === 0) {
			throw new Error("No images returned from Livepeer")
	}

	try {
		urls = images.map((image: LivepeerImage) => {
			return image.url
		})
	} catch (e) {
		console.error("Error parsing image URLs", e)
	}
	return urls
}


/**
 * Create a request object for our use.
 *
 * @param {Object} options - The options for the
 *  current request.
 *
 * @return {Promise<Response>} - The promise resolves
 *  to the response from the Livepeer service.
 *
 * @private
 */
const _request = async (options: object): Promise<Response> => {
	const endpoint = `https://${livepeer_sd_gateway}/text-to-image`
	return fetch(endpoint, options)
}

export const sendTextMessage = (client: WebSocket, payload: TextType) => {
	_send(client, {
		type: "text",
		payload,
	})
}

export const sendImageMessage = (client: WebSocket, payload: ImageType) => {
	_send(client, {
		type: "image",
		payload,
	})
}

export const sendStateMessage = (client: WebSocket, payload: StateType) => {
	_send(client, {
		type: "state",
		payload,
	})
}

export const sendErrorMessage = (client: WebSocket, payload: ErrorType) => {
	_send(client, {
		type: "error",
		payload,
	})
}

const _send = (c: WebSocket, p: object) => {
	c.send(JSON.stringify(p))
}

/**
 * Saves the meta-data associated with an ongoing Storytime
 *  session.
 *
 * @param {String} fileName - The output file name for the
 *  metadata to be stored in.
 * @param {Object} payload - The object to write to the file.
 */
export const saveMetaData_storytime = (
	fileName: string,
	payload: { prompt: string; genre: Genre },
) => {
	const { prompt, genre } = payload
	const metadata = {
		model: process.env.OPENAI_MODEL ?? "unknown",
		prompt,
		genre,
	}

	const fullOutputFilePath =
		process.cwd() + "/output/story/" + fileName + ".json"

	const dir = path.dirname(fullOutputFilePath);

	// Ensure the directory exists
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

	const string = JSON.stringify(metadata, null, 2)
	const metaFile = createWriteStream(
		fullOutputFilePath,
		{
			encoding: "utf-8",
		},
	)
	metaFile.write(string)
	metaFile.end()
}

/**
 * Saves the meta-data associated with an ongoing Chatbot
 *  session.
 *
 * @param {String} fileName - The output file name for the
 *  metadata to be stored in.
 * @param {Object} payload - The object to write to the file.
 */
export const saveMetaData_chat_bot = (
	fileName: string,
	payload: { prompt: string; textCompletionParams: OpenAIParams_text_completion },
) => {
	const { prompt, textCompletionParams } = payload
	const metadata = {
		prompt,
		textCompletionParams,
	}

	const fullOutputFilePath =
		process.cwd() + "/output/chat/" + fileName + ".json"

	const dir = path.dirname(fullOutputFilePath);

	// Ensure the directory exists
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

	const string = JSON.stringify(metadata, null, 2)
	const metaFile = createWriteStream(
		fullOutputFilePath,
		{
			encoding: "utf-8",
		},
	)
	metaFile.write(string)
	metaFile.end()
}


export const saveImageURLs = (fileName: string, payload: string[]) => {
	const urls = {
		urls: payload,
	}

	const string = JSON.stringify(urls, null, 2)


	const fullOutputFilePath =
		process.cwd() + "/output/image/" + fileName + ".json"

	const dir = path.dirname(fullOutputFilePath);

	// Ensure the directory exists
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

	const metaFile = createWriteStream(
		fullOutputFilePath,
		{
			encoding: "utf-8",
		},
	)
	metaFile.write(string)
	metaFile.end()
}
