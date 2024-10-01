// This file contains code and objects to help with various
//  OpenAI call parameters.

/**
 * Class representing the parameters for an OpenAI text completion call.
 */
export class OpenAIParams_text_completion {
	/**
	 * @type {number} Top-p sampling parameter value.
	 * @default 0.5
	 */
	public top_p_param_val: number = 0.5;

	/**
	 * @type {number} Maximum tokens parameter value.
	 * @default 150
	 */
	public max_tokens_param_val: number = 150;

	/**
	 * @type {number} Temperature parameter value.
	 * Controls the randomness of the model's output.
	 * @default 0.5
	 */
	public temperature_param_val: number = 0.5;

	/**
	 * @type {number} Presence penalty parameter value.
	 * Controls how much to penalize new tokens based on whether they appear in the text so far.
	 * @default 0.5
	 */
	public presence_penalty_param_val: number = 0.5;

	/**
	 * @type {number} Frequency penalty parameter value.
	 * Controls how much to penalize new tokens based on their existing frequency in the text.
	 * @default 0.5
	 */
	public frequency_penalty_param_val: number = 0.5;

	/**
	 * @type {boolean} Stream parameter value.
	 * Determines whether the API response should be streamed or not.
	 * @default false
	 */
	public stream_param_val: boolean = false;

	/**
	 * @type {string} Model parameter value.
	 * Specifies the model to use for the API call.
	 * @default "gpt-3.5-turbo"
	 */
	public model_param_val: string = "gpt-3.5-turbo";

	/**
	 * Creates a new instance of OpenAIParams with default or custom values.
	 * @param {Partial<OpenAIParams_text_completion>} [params] Optional parameters to initialize the object.
	 */
	constructor(params?: Partial<OpenAIParams_text_completion>) {
		if (params) {
			Object.assign(this, params);
		}
	}
}
