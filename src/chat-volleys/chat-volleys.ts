// This module contains the code and classes for maintaining
//  a chat history for a particular user.

// -------------------- BEGIN: DEFAULT IMAGE GENERATION VALUES ------------

// These are the default choices we make for various image
//  generation parameters.
import { getCurrentOrAncestorPathForSubDirOrDie, getUnixTimestamp } from "../common-routines"

/*
The parentheses in the recommended negative prompt are part of the syntax used to influence how strongly the model weighs certain words or phrases. Here's a breakdown:

Parentheses () are used to group terms or phrases and apply emphasis.
The numbers like :1.3 or :1.2 after the colon indicate the strength or weight of the negative prompt. A number greater than 1.0 increases the strength, and a number less than 1.0 would decrease it.

So, when including the negative prompt in your request to the model, you should include the parentheses and weights exactly as shown, as they help guide the model on which attributes to minimize more aggressively.
 */
const DEFAULT_NEGATIVE_PROMPT = '(octane render, render, drawing, anime, bad photo, bad photography:1.3), (worst quality, low quality, blurry:1.2), (bad teeth, deformed teeth, deformed lips), (bad anatomy, bad proportions:1.1), (deformed iris, deformed pupils), (deformed eyes, bad eyes), (deformed face, ugly face, bad face), (deformed hands, bad hands, fused fingers), morbid, mutilated, mutation, disfigured';

const CONSOLE_CATEGORY = 'chat-volley'

// -------------------- END  : DEFAULT IMAGE GENERATION VALUES ------------

// -------------------- BEGIN: class, CurrentChatState ------------

import fs from "fs"
import path from "node:path"
import { readJsonFile, writeJsonFile } from "../json/json-file-substitute"
import { TextCompletionResponse } from "../openai-parameter-objects"
import {
	DEFAULT_GUIDANCE_SCALE,
	DEFAULT_IMAGE_GENERATION_MODEL_ID, DEFAULT_NUMBER_OF_IMAGE_GENERATION_STEPS,
	enumImageGenerationModelId,
	IntentJsonResponseObject,
} from "../enum-image-generation-models"
import { StateType } from "../system/types"

/**
 * Represents the current state of the chat, particularly for image generation settings.
 */
export class CurrentChatState {
	/**
	 * The model currently selected for image generation.
	 */
	public model_id: string;

	/**
	 * The LoRA models object.  If any LoRA objects have
	 *  been selected, there will be a property for each
	 *  one where the property name is the LoRA model ID
	 *  and property value is the version number.
	 */
	public loras: {};

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
	 * @param model_id - The model currently selected for image generation.
	 * @param loras - The LoRA object that has the currently selected, if any, LoRA models.
	 * @param guidance_scale - The current value set for the context free guidance parameter.
	 * @param steps - The current value set for the number of steps to use when generating an image.
	 */
	constructor(
			model_id: string,
			loras: object,
			guidance_scale: number,
			steps: number) {
		this.model_id = model_id;
		this.loras = loras;
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
				{},
				DEFAULT_GUIDANCE_SCALE,
				DEFAULT_NUMBER_OF_IMAGE_GENERATION_STEPS
			);

		return newObj
	}

	// -------------------- BEGIN: SERIALIZATION METHODS ------------

	// Serialization method
	public toJSON() {
		return {
			__type: 'CurrentChatState',
			model_id: this.model_id,
			loras: this.loras,
			guidance_scale: this.guidance_scale,
			steps: this.steps,
			timestamp: this.timestamp,
		};
	}

	// Deserialization method
	static fromJSON(json: any): CurrentChatState {
		return new CurrentChatState(
			json.model_id,
			json.loras,
			json.guidance_scale,
			json.steps
		);
	}

	// Use the serialization methods to clone a current chat state
	//  object, to avoid unwanted couplings between objects.
	public clone() {
		return CurrentChatState.fromJSON(this.toJSON())
	}

	// -------------------- END  : SERIALIZATION METHODS ------------
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
	public text_completion_response: TextCompletionResponse;

	/**
	 * The state of the chat at the start of the volley.
	 */
	public chat_state_at_start: CurrentChatState;

	/**
	 * The state of the chat at the end of the volley.
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
	 * The response that was shown to the user in the
	 *  client.
	 */
	public response_to_user: string;

	/**
	 * Array of intent detection JSON response objects that
	 *  were provided by the LLM response.
	 */
	public array_of_intent_detections: IntentJsonResponseObject[];

	/**
	 * The full system prompt we sent to the LLM for consideration.
	 */
	public full_prompt_to_system: string;

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
	 * @param text_completion_response - The whole response from the image generator prompt maker LLM.
	 * @param response_sent_to_client - The response we sent to the user via the client websocket connection.
	 * @param chat_state_at_start - The state of the chat at the start of the volley.
	 * @param chat_state_at_end - The state of the chat at the end of the volley.
	 * @param array_of_intent_detections - Array of intent detections including complaint type and complaint text.
	 * @param full_prompt_to_system - The full prompt we sent to the LLM
	 *  for consideration.
	 */
	constructor(
		is_new_image: boolean,
		override_timestamp: number | null,
		user_input: string,
		prompt: string,
		negative_prompt: string,
		text_completion_response: TextCompletionResponse,
		response_sent_to_client: string,
		chat_state_at_start: CurrentChatState,
		chat_state_at_end: CurrentChatState,
		array_of_intent_detections: IntentJsonResponseObject[],
		full_prompt_to_system: string
	) {
		this.is_new_image = is_new_image;

		// If an override timestamp was provided, use it.
		//  Otherwise, default to the current date/time.
		this.timestamp =
			override_timestamp
				? override_timestamp
				: getUnixTimestamp();

		this.user_input = user_input;
		this.text_completion_response = text_completion_response;
		this.chat_state_at_start = chat_state_at_start;
		this.chat_state_at_end = chat_state_at_end;
		this.array_of_intent_detections = array_of_intent_detections;
		this.prompt = prompt;
		this.negative_prompt = negative_prompt;
		this.response_to_user = response_sent_to_client;
		this.full_prompt_to_system = full_prompt_to_system;
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

	/**
	 * This function creates a JSON object but as a
	 *  plain string that will be passed to the LLM
	 *  as part of the recent chat history.
	 *
	 * NOTE!:  Make sure the format matches that we
	 *  illustrated in the main system prompt!
	 */
	public buildChatVolleySummary_json() {
		return `
		    {\n
		    	"    user_input": ${this.user_input},\n
		    	"    prompt": ${this.prompt},\n
		    	"    negative_prompt": ${this.negative_prompt}\n
		    }\n
		`
	}

	/**
	 * This function creates a text block that
	 *   will be passed to the LLM as part of
	 *   the recent chat history.
	 *
	 * NOTE!:  Make sure the format matches that we
	 *  illustrated in the main system prompt!
	 */
	public buildChatVolleySummary_text() {
		const strSummary =
		    	`USER INPUT: ${this.user_input},\n
		    	 SYSTEM RESPONSE: ${this.prompt},\n`

		    	 // TODO: Re-enable this once we solve the vanishing
				 //  previous image content issue.
		    	 // NEGATIVE PROMPT: ${this.negative_prompt}\n`
		return strSummary
	}

	// -------------------- BEGIN: SERIALIZATION METHODS ------------

	// Serialization method
	public toJSON() {
		return {
			__type: 'ChatVolley',
			is_new_image: this.is_new_image,
			timestamp: this.timestamp,
			user_input: this.user_input,
			text_completion_response: this.text_completion_response,
			chat_state_at_start: this.chat_state_at_start.toJSON(),
			chat_state_at_end: this.chat_state_at_end.toJSON(),
			prompt: this.prompt,
			negative_prompt: this.negative_prompt,
			response_to_user: this.response_to_user,
			array_of_intent_detections: this.array_of_intent_detections,
			full_prompt_to_system: this.full_prompt_to_system
		};
	}

	// Deserialization method
	static fromJSON(json: any): ChatVolley {
		return new ChatVolley(
			json.is_new_image,
			json.timestamp,
			json.user_input,
			json.prompt,
			json.negative_prompt,
			json.text_completion_response,
			json.response_to_user,
			CurrentChatState.fromJSON(json.chat_state_at_start),
			CurrentChatState.fromJSON(json.chat_state_at_end),
			json.array_of_intent_detections,
			json.full_prompt_to_system
		);
	}

	// -------------------- END  : SERIALIZATION METHODS ------------
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

	/**
	 * Builds a pure text summary of the recent chat history
	 *  with the user, to be passed on to the LLM as part
	 *  of the prompt text.
	 *
	 * @param numChatVolleys - The number of chat volleys
	 *  to include in the history.  The most recent ones
	 *  will be chosen from the end of the array up to
	 *  the number available.
	 */
	public buildChatHistoryPrompt(numChatVolleys: number = 4): string {
		if (numChatVolleys < 1)
			throw new Error(`The number of chat volleys must be greater than 0.`);
		if (!Number.isInteger(numChatVolleys))
			throw new Error(`The number of chat volleys must be an integer.`);

		let strChatHistory = ''

		if (this.aryChatVolleys.length > 0) {
			const aryChatVolleysSlice =
				this.aryChatVolleys.slice(-1 * numChatVolleys)

			const aryChatSummaries: string[] = [];

			aryChatVolleysSlice.forEach(
				obj => {
					aryChatSummaries.push(
						obj.buildChatVolleySummary_text())
				})

			const preamble =
				`
Below is your chat history with the user    

What they said to you is prefixed by the string "USER INPUT:"
  
Your response to their input is prefixed by the string "SYSTEM RESPONSE:"
  
Use the chat history to help guide your efforts.  Here it is now:

				`

			strChatHistory =
				preamble + aryChatSummaries.join('\n')
		}

		return strChatHistory
	}

	// -------------------- BEGIN: SERIALIZATION METHODS ------------

	// Serialization method
	public toJSON() {
		return {
			__type: 'ChatHistory',
			aryChatVolleys: this.aryChatVolleys.map(volley => volley.toJSON()),
		};
	}

	// Deserialization method
	static fromJSON(json: any): ChatHistory {
		const history = new ChatHistory();
		history.aryChatVolleys = json.aryChatVolleys.map((volley: any) => ChatVolley.fromJSON(volley));
		return history;
	}

	// -------------------- END  : SERIALIZATION METHODS ------------
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

	// Get the subdirectory for chat history files.
	const resolvedFilePath =
		getCurrentOrAncestorPathForSubDirOrDie(CONSOLE_CATEGORY, DIR_CHAT_HISTORY_FILES);

	// Build the full path to the chat history file
	const primaryFileName = `${trimmedUserId}-chat-history.json`;

	// Construct the path dynamically
	const fullFilePath = path.join(resolvedFilePath, primaryFileName);

	return fullFilePath
}

// ***********************************************
/**
 * Writes the ChatHistory object to disk as a JSON file.
 *
 * @param {string} userId - The user ID associated with the chat history.
 * @param {ChatHistory} chatHistory - The chat history object to write to disk.
 */
export async function writeChatHistory(userId: string, chatHistory: ChatHistory): Promise<void> {
	const filename = buildChatHistoryFilename(userId);
	const jsonData = JSON.stringify(chatHistory, null, 2);  // Pretty print the JSON

	await writeJsonFile(filename, jsonData);
}

/**
 * Reads the chat history for a given user.
 *
 * @param {string} userId - The user ID whose chat history should be read.
 *
 * @returns {ChatHistory} The chat history object for the given user.  If one does not exist yet a brand new chat history object will be returned.
 */
export async function readChatHistory(userId: string): Promise<ChatHistory>  {
	const trimmedUserId = userId.trim()

	// Validate that the userId is not empty
	if (!trimmedUserId) {
		throw new Error('User ID cannot be empty.');
	}

	// Build the full path to the chat history file
	const fullPathToJsonFile = buildChatHistoryFilename(trimmedUserId);

	// Check if the file exists
	if (fs.existsSync(fullPathToJsonFile)) {
		// -------------------- BEGIN: LOAD EXISTING FILE ------------

		const filename = buildChatHistoryFilename(userId);
		const jsonData = await readJsonFile(filename);
		const parsedData = JSON.parse(jsonData);

		if (parsedData.__type === 'ChatHistory') {
			return ChatHistory.fromJSON(parsedData);
		} else {
			throw new Error("Invalid ChatHistory file format");
		}

		// -------------------- END  : LOAD EXISTING FILE ------------
	} else {
		// -------------------- BEGIN: BRAND NEW USER ------------

		return new ChatHistory()

		// -------------------- END  : BRAND NEW USER ------------
	}
}

/**
 * Returns a default StateType object with the fields initialized
 * to starting values. Allows passing in partial overrides for the state.
 *
 * @param overrides - An optional object that contains one or more fields from StateType to override the defaults.
 * @returns {StateType} - The default state with optional overrides.
 */
export function getDefaultState(overrides: Partial<StateType> = {}): StateType {
	// Default state object
	const defaultState: StateType = {
		streaming_audio: false,
		streaming_text: false,
		waiting_for_images: false,
		current_request_id: "",
		state_change_message: ""
	};

	// Return the merged object, with overrides replacing defaults where provided
	return { ...defaultState, ...overrides };
}


// -------------------- END  : UTILITY FUNCTIONS ------------