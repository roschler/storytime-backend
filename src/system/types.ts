import { UserBlockchainPresence } from "../blockchain/user-blockchain-presence"

/**
 * Simple true/false result object for most responses
 *  to client side requests.
 */
export interface OperationResult {
	result: boolean
}

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
 * This is the response payload created as a result of
 *  a Twitter share request from the client front-end.
 *
 * WARNING: This interface must match the declaration
 *  used by the client front-end.
 *
export interface TwitterImageCardUrlType {
	tweet_text: string,
	url_to_twitter_card: string,
	hash_tags_array: string[]
}
*/

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
	dimensions: ImageDimensions,

	// This field contains the custom
	//  value, if any, that the client passed
	//  to the back-end server during
	//  a request to it, in the
	//  TwitterCardDetails object.
	client_user_message: string
}

/**
 * This is the expected request payload for a request from
 *  the client front-end to share a generated image on
 *  Twitter.
 *
 * WARNING: This interface must match the declaration
 *  used by the client front-end.
 */
export interface GetUserBlockchainPresenceRequest {
	// The public address of the user making the request.
	user_public_address: string
}

/**
 * This is the expected request payload for a request from
 *  the client front-end to share a generated image on
 *  Twitter.
 *
 * WARNING: This interface must match the declaration
 *  used by the client front-end.
 */
export interface StoreUserBlockchainPresenceRequest {
	// The public address of the user making the request.
	user_public_address: string,

	// The user blockchain presence object to store for the
	//  given public address.
	user_blockchain_presence: UserBlockchainPresence
}

/**
 * This interface describes a Twitter card details object.
 *
 * NOTE: For now we are also using this object for the
 *  mint NFT operation too, in order to get back
 *  the S3 URI created for the generated image.
 *
 * WARNING: This interface must match the declaration
 *  used by the client front-end.
 */
export interface TwitterCardDetails {
	card: string,
	tweet_text: string,
	hash_tags_array: string[],
	twitter_card_title: string,
	twitter_card_description: string,
	url_to_image: string,
	dimensions: ImageDimensions,

	// This is a copy of the full Twitter card URL
	//  that is here for convenience purposes to
	//  help the caller.
	twitter_card_url: string,

	// This field can be used by the front-end
	//  client to pass custom information back
	//  to itself.
	client_user_message: string
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
