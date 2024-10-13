export interface LivepeerImage {
	seed: number
	url: string
	nsfw: boolean
}
export interface StateType {
	streaming_audio: boolean
	streaming_text: boolean
	waiting_for_images: boolean
	current_request_id: string
	state_change_message: string
}

export interface ErrorType {
	error: string
}

export interface TextType {
	delta: string
}

export interface ImageType {
	urls: string[]
}

export interface ImageDimensions{
	width: number,
	height: number
}

/**
 * This is the expected request payload for a request from
 *  the client front-end to share a generated image on
 *  Twitter.
 *
 * WARNING: This interface must match the declaration
 *  used by the client front-end.
 */
export interface ShareImageOnTwitterRequest {
	// The ID of the user making the request.
	user_id: string,
	// The Livepeer image URL for the generated image.
	image_url: string,
	// The image dimensions.
	dimensions: ImageDimensions
}

/**
 * This is response payload we send to the client
 *  in response to a share image on Twitter request.
 *
 * WARNING: This interface must match the declaration
 *  used by the client front-end.
 */
export interface TwitterImageCardUrlResponse {
	// We send back to the client the URL to our back-end
	//  server that will build the Twitter card for
	//  previewing the selected generated image on a Tweet.
	url_to_twitter_card: string,
}

/**
 * This interface describes a Twitter card details object.
 */
export interface TwitterCardDetails {
	card: string,
	tweet_text: string,
	hash_tags_array: string[],
	twitter_card_title: string,
	twitter_card_description: string,
	url_to_image: string,
	dimensions: ImageDimensions
}

// The request payload for a Storytime app request.
export interface RequestPayload_storytime {
	prompt: string
	genre: Genre
}

// The request payload for a Chatbot app request.
export interface RequestPayload_chat_bot {
	prompt: string
}

export interface Prompt {
	prompt: string
	caveat?: string
}

export type Genre =
	| "magic"
	| "scifi"
	| "swords"
	| "romance"
	| "drama"
	| "apocalypse"
	| "hollywood"
	| "singularity"
