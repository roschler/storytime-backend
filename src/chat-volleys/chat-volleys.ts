// This module contains the code and classes for maintaining
//  a chat history for a particular user.

// -------------------- BEGIN: DEFAULT IMAGE GENERATION VALUES ------------

// These are the default choices we make for various image
//  generation parameters.
import { getUnixTimestamp } from "../common-routines"

const DEFAULT_IMAGE_GENERATION_MODEL_ID = 'RealVisXL_V4.0_Lightning';
// If this value is empty, then we are not using a LoRA
//  model by default.
const DEFAULT_LORA_MODEL_ID = '';
const DEFAULT_GUIDANCE_SCALE = 7.5;
const DEFAULT_NUMBER_OF_IMAGE_GENERATION_STEPS  = 20;
/*
The parentheses in the recommended negative prompt are part of the syntax used to influence how strongly the model weighs certain words or phrases. Here's a breakdown:

Parentheses () are used to group terms or phrases and apply emphasis.
The numbers like :1.3 or :1.2 after the colon indicate the strength or weight of the negative prompt. A number greater than 1.0 increases the strength, and a number less than 1.0 would decrease it.

So, when including the negative prompt in your request to the model, you should include the parentheses and weights exactly as shown, as they help guide the model on which attributes to minimize more aggressively.
 */
const DEFAULT_NEGATIVE_PROMPT = '(octane render, render, drawing, anime, bad photo, bad photography:1.3), (worst quality, low quality, blurry:1.2), (bad teeth, deformed teeth, deformed lips), (bad anatomy, bad proportions:1.1), (deformed iris, deformed pupils), (deformed eyes, bad eyes), (deformed face, ugly face, bad face), (deformed hands, bad hands, fused fingers), morbid, mutilated, mutation, disfigured';

// -------------------- END  : DEFAULT IMAGE GENERATION VALUES ------------

// -------------------- BEGIN: class, CurrentChatState ------------

import fs from "fs"
import path from "node:path"
import { readJsonFile, writeJsonFile } from "../json/json-file-substitute"

/**
 * Represents the current state of the chat, particularly for image generation settings.
 */
export class CurrentChatState {
	/**
	 * The model currently selected for image generation.
	 */
	public model_id: string;

	/**
	 * The LoRA model ID currently selected.  If an empty
	 *  string then we are not using a LoRA model
	 *  currently.
	 */
	public lora_model_id: string;

	/**
	 * The current value set for the context free guidance parameter.
	 */
	public guidance_scale: number;

	/**
	 * The current value set for the number of steps to use when generating an image.
	 */
	public steps: number;

	/**
	 * The timestamp for the date/time this object was created.
 	 */
	public timestamp: number = getUnixTimestamp() ;

	/**
	 * Constructs an instance of CurrentChatState.
	 *
	 * @param {string} model_id - The model currently selected for image generation.
	 * @param {string} lora_model_id - The LoRA model ID currently selected.
	 * @param {number} guidance_scale - The current value set for the context free guidance parameter.
	 * @param {number} steps - The current value set for the number of steps to use when generating an image.
	 */
	constructor(
			model_id: string,
			lora_model_id: string,
			guidance_scale: number,
			steps: number) {
		this.model_id = model_id;
		this.lora_model_id = lora_model_id;
		this.guidance_scale = guidance_scale;
		this.steps = steps;
	}

	/**
	 * Create an object of this type, initialized with
	 *  our default values.
	 */
	public static createDefaultObject(): CurrentChatState {
		const newObj =
			new CurrentChatState(
				DEFAULT_IMAGE_GENERATION_MODEL_ID,
				DEFAULT_LORA_MODEL_ID,
				DEFAULT_GUIDANCE_SCALE,
				DEFAULT_NUMBER_OF_IMAGE_GENERATION_STEPS
			);

		return newObj;
	}
}


// -------------------- END  : class, CurrentChatState ------------

// -------------------- BEGIN: ChatVolley ------------

/**
 * Represents a volley of communication between the user and the system, tracking various states.
 */
export class ChatVolley {
	/**
	 * If TRUE, then this chat volley is considered to
	 *  be the start of a new image generation session.
	 *  If FALSE, then it is considered to be a
	 *  continuation of an existing image generation
	 *  session.
	 */
	public is_new_image: boolean;

	/**
	 * The current date/time in Unix timestamp format.
	 */
	public timestamp: number;

	/**
	 * The user input received that began the volley.
	 */
	public user_input: string;

	/**
	 * The response from our system.
	 */
	public system_response: string;

	/**
	 * The state of the chat at the start of the volley.
	 */
	public chat_state_at_start: CurrentChatState;

	/**
	 * The state of the chat atthe end of the volley.
	 */
	public chat_state_at_end: CurrentChatState;

	/**
	 * The full prompt that was passed to the
	 *  image generator model.
	 */
	public prompt: string;

	/**
	 * The full negative prompt that was passed to the
	 *  image generator model.
	 */
	public negative_prompt: string;

	/**
	 * Array of intent detections including complaint type and complaint text.
	 */
	public array_of_intent_detections: { complaint_type: string; complaint_text: string }[];

	/**
	 * Constructs an instance of ChatVolley.
	 *
	 * @param is_new_image - If TRUE, then this volley is considered
	 *  the start of a new image creation session.  If FALSE, then
	 *  it is considered the continuation of an existing image
	 *  generation session.
	 * @param override_timestamp - If you want to assign a specific
	 *  timestamp value, use this parameter to do that.  Otherwise,
	 *  pass NULL and the current date/time will be used.
	 * @param user_input - The user input received that began the volley.
	 * @param prompt - The prompt that was passed to the image generator model.
	 * @param negative_prompt - The negative prompt that was passed to the image generator model.
	 * @param system_response - The response from our system.
	 * @param chat_state_at_start - The state of the chat at the start of the volley.
	 * @param chat_state_at_end - The state of the chat at the end of the volley.
	 * @param array_of_intent_detections - Array of intent detections including complaint type and complaint text.
	 */
	constructor(
		is_new_image: boolean,
		override_timestamp: number | null,
		user_input: string,
		prompt: string,
		negative_prompt: string,
		system_response: string,
		chat_state_at_start: CurrentChatState,
		chat_state_at_end: CurrentChatState,
		array_of_intent_detections: { complaint_type: string; complaint_text: string}[]
	) {
		this.is_new_image = is_new_image;

		// If an override timestamp was provided, use it.
		//  Otherwise, default to the current date/time.
		this.timestamp =
			override_timestamp
				? override_timestamp
				: getUnixTimestamp();

		this.user_input = user_input;
		this.system_response = system_response;
		this.chat_state_at_start = chat_state_at_start;
		this.chat_state_at_end = chat_state_at_end;
		this.array_of_intent_detections = array_of_intent_detections;
		this.prompt = prompt;
		this.negative_prompt = negative_prompt;
	}

	/**
	 * This function returns the total time it took to
	 *  process this chat volley.
	 */
	public getVolleyRoundTripTime_milliseconds(): number {
		const deltaChatStates =
			this.chat_state_at_end.timestamp -
				this.chat_state_at_start.timestamp;

		return deltaChatStates;
	}
}

// -------------------- END  : ChatVolley ------------

// -------------------- BEGIN: ChatHistory ------------

/**
 * Manages a collection of ChatVolley objects.
 */
export class ChatHistory {
	/**
	 * The chat volleys accumulated so far.
	 * @type {ChatVolley[]}
	 */
	public aryChatVolleys: ChatVolley[];

	/**
	 * Constructs an instance of ChatHistory.
	 */
	constructor() {
		this.aryChatVolleys = [];
	}

	/**
	 * Returns TRUE if aryChatVolleys is empty, FALSE if not.
	 *
	 * @returns {boolean} Whether the chat history is empty.
	 */
	public isHistoryEmpty(): boolean {
		return this.aryChatVolleys.length === 0;
	}

	/**
	 * Returns the last ChatVolley object in aryChatVolleys if not empty, otherwise returns null.
	 *
	 * @returns {ChatVolley | null} The last ChatVolley or null if history is empty.
	 */
	public getLastVolley(): ChatVolley | null {
		if (this.isHistoryEmpty()) {
			return null;
		}
		return this.aryChatVolleys[this.aryChatVolleys.length - 1];
	}

	/**
	 * Appends the newChatVolley object to the aryChatVolleys array.
	 *
	 * @param {ChatVolley} newChatVolley - The new ChatVolley to add.
	 */
	public addChatVolley(newChatVolley: ChatVolley): void {
		this.aryChatVolleys.push(newChatVolley);
	}
}

// -------------------- END  : ChatHistory ------------

// -------------------- BEGIN: READ/WRITE ChatHistory OBJECTS ------------

/**
 * The directory where chat history files are stored.
 * @constant
 * @type {string}
 */
export const DIR_CHAT_HISTORY_FILES = 'chat-history-files';

/**
 * Builds the full path to the user's chat history file.
 *
 * @param {string} userId - The user ID to build the file name for.
 * @returns {string} The full path to the user's chat history JSON file.
 * @throws {Error} If the userId is empty or contains invalid characters for a file name.
 */
export function buildChatHistoryFilename(userId: string): string {
	const trimmedUserId = userId.trim();

	// Validate that the userId is not empty
	if (!trimmedUserId) {
		throw new Error('User ID cannot be empty.');
	}

	// Validate that the userId contains no invalid characters for a file name
	const invalidChars = /[<>:"/\\|?*\x00-\x1F]/;
	if (invalidChars.test(trimmedUserId)) {
		throw new Error('User ID contains invalid characters for a file name.');
	}

	// Build the full path to the chat history file
	const filename = `${trimmedUserId}-chat-history.json`;
	return path.join(DIR_CHAT_HISTORY_FILES, filename);
}

/**
 * Reads the chat history for a given user.
 *
 * @param {string} userId - The user ID whose chat history should be read.
 *
 * @returns {ChatHistory} The chat history object for the given user.
 */
export async function readChatHistory(userId: string): Promise<ChatHistory> {
	const trimmedUserId = userId.trim();

	// Validate that the userId is not empty
	if (!trimmedUserId) {
		throw new Error('User ID cannot be empty.');
	}

	// Build the full path to the chat history file
	const fullPathToJsonFile = buildChatHistoryFilename(trimmedUserId);

	// Check if the file exists
	if (!fs.existsSync(fullPathToJsonFile)) {
		throw new Error(`Chat history file does not exist for user ID: ${trimmedUserId}`);
	}

	// Cast to unknown first, then to ChatHistory
	const chatHistory =
		await readJsonFile(fullPathToJsonFile) as unknown as ChatHistory;

	return chatHistory;
}

/**
 * Writes the chat history for a given user.
 *
 * @param {string} userId - The user ID whose chat history should be written.
 * @param {ChatHistory} chatHistoryObj - The chat history object to write to the file.
 * @throws {Error} If the user ID is empty.
 */
export async function writeChatHistory(userId: string, chatHistoryObj: ChatHistory): Promise<void> {
	const trimmedUserId = userId.trim();

	// Validate that the userId is not empty
	if (!trimmedUserId) {
		throw new Error('User ID cannot be empty.');
	}

	// Build the full path to the chat history file
	const fullPathToJsonFile = buildChatHistoryFilename(trimmedUserId);

	// Write the chat history object to the file

	await writeJsonFile(fullPathToJsonFile, chatHistoryObj);
}

// -------------------- END  : READ/WRITE ChatHistory OBJECTS ------------