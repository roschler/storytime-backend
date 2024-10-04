// This module contains the code and classes for maintaining
//  a chat history for a particular user.

// -------------------- BEGIN: class, CurrentChatState ------------

import fs from "fs"
import path from "node:path"

/**
 * Represents the current state of the chat, particularly for image generation settings.
 */
export class CurrentChatState {
	/**
	 * The model currently selected for image generation.
	 */
	public model_id: string;

	/**
	 * The LoRA model ID currently selected.
	 */
	public lora_model_id: string;

	/**
	 * The current value set for the context free guidance parameter.
	 */
	public cfg: number;

	/**
	 * The current value set for the number of steps to use when generating an image.
	 */
	public steps: number;

	/**
	 * Constructs an instance of CurrentChatState.
	 *
	 * @param {string} model_id - The model currently selected for image generation.
	 * @param {string} lora_model_id - The LoRA model ID currently selected.
	 * @param {number} cfg - The current value set for the context free guidance parameter.
	 * @param {number} steps - The current value set for the number of steps to use when generating an image.
	 */
	constructor(model_id: string, lora_model_id: string, cfg: number, steps: number) {
		this.model_id = model_id;
		this.lora_model_id = lora_model_id;
		this.cfg = cfg;
		this.steps = steps;
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
	 * The ID of the image generation model at the start of the volley.
	 */
	public model_id_at_start: string;

	/**
	 * The ID of the image generation model at the end of the volley.
	 */
	public model_id_at_end: string;

	/**
	 * The ID of the LORA image generation sub-model at the start of the volley.
	 */
	public lora_model_id_at_start: string;

	/**
	 * The ID of the LORA image generation sub-model at the end of the volley.
	 */
	public lora_model_id_at_end: string;

	/**
	 * The context free guidance value at the start of the volley.
	 */
	public cfg_at_start: number;

	/**
	 * The context free guidance value at the end of the volley.
	 */
	public cfg_at_end: number;

	/**
	 * The steps value at the start of the volley.
	 */
	public steps_at_start: number;

	/**
	 * The steps value at the end of the volley.
	 */
	public steps_at_end: number;

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
	 * @param user_input - The user input received that began the volley.
	 * @param system_response - The response from our system.
	 * @param model_id_at_start - The ID of the image generation model at the start of the volley.
	 * @param model_id_at_end - The ID of the image generation model at the end of the volley.
	 * @param lora_model_id_at_start - The ID of the LORA image generation sub-model at the start of the volley.
	 * @param lora_model_id_at_end - The ID of the LORA image generation sub-model at the end of the volley.
	 * @param cfg_at_start - The context free guidance value at the start of the volley.
	 * @param cfg_at_end - The context free guidance value at the end of the volley.
	 * @param steps_at_start - The steps value at the start of the volley.
	 * @param steps_at_end - The steps value at the end of the volley.
	 * @param array_of_intent_detections - Array of intent detections including complaint type and complaint text.
	 */
	constructor(
		is_new_image: boolean,
		user_input: string,
		system_response: string,
		model_id_at_start: string,
		model_id_at_end: string,
		lora_model_id_at_start: string,
		lora_model_id_at_end: string,
		cfg_at_start: number,
		cfg_at_end: number,
		steps_at_start: number,
		steps_at_end: number,
		array_of_intent_detections: { complaint_type: string; complaint_text: string }[]
	) {
		this.is_new_image = is_new_image;
		this.timestamp = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
		this.user_input = user_input;
		this.system_response = system_response;
		this.model_id_at_start = model_id_at_start;
		this.model_id_at_end = model_id_at_end;
		this.lora_model_id_at_start = lora_model_id_at_start;
		this.lora_model_id_at_end = lora_model_id_at_end;
		this.cfg_at_start = cfg_at_start;
		this.cfg_at_end = cfg_at_end;
		this.steps_at_start = steps_at_start;
		this.steps_at_end = steps_at_end;
		this.array_of_intent_detections = array_of_intent_detections;
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
 * @returns {ChatHistory} The chat history object for the given user.
 * @throws {Error} If the user ID is empty or if the chat history file does not exist.
 */
export function readChatHistory(userId: string): ChatHistory {
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

	// Read and return the chat history file
	return jsonfile.readFileSync(fullPathToJsonFile);
}

/**
 * Writes the chat history for a given user.
 *
 * @param {string} userId - The user ID whose chat history should be written.
 * @param {ChatHistory} chatHistoryObj - The chat history object to write to the file.
 * @throws {Error} If the user ID is empty.
 */
export function writeChatHistory(userId: string, chatHistoryObj: ChatHistory): void {
	const trimmedUserId = userId.trim();

	// Validate that the userId is not empty
	if (!trimmedUserId) {
		throw new Error('User ID cannot be empty.');
	}

	// Build the full path to the chat history file
	const fullPathToJsonFile = buildChatHistoryFilename(trimmedUserId);

	// Write the chat history object to the file
	jsonfile.writeFileSync(fullPathToJsonFile, chatHistoryObj, { spaces: 2 }); // Pretty-print the JSON with 2 spaces
}

// -------------------- END  : READ/WRITE ChatHistory OBJECTS ------------