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

/**
 * This is the expected request payload for a image share
 *  on Twitter operation.
 *
 * WARNING: This interface must match the declaration
 *  for ShareImageOnTwitterPayload used by the client
 *  front-end.
 */
export interface ShareImageOnTwitterType {
	// We send back to the client the URL to our back-end
	//  server that will build the Twitter card for
	//  previewing the image on the Tweet.
	url_to_twitter_card: string,
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
