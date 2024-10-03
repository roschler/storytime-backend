// This module contains the IDs for the intents we created.

// -------------------- BEGIN: enumIntentDetectorId ------------

// These are the IDs for each of the INTENT detectors we have created
//  so far.  They must be unique!

/**
 * Enum that contains all the intent detector IDs
 */
export enum enumIntentDetectorId {
	// User does or does not want text on the generated image.
	IS_TEXT_WANTED_ON_IMAGE = "is_text_wanted_on_image",
	// User is complaining about the image quality.
	USER_COMPLAINT_IMAGE_QUALITY = "user_complaint_image_quality",
	// User is complaining about the generation speed.
	USER_COMPLAINT_SPEED = "user_complaint_speed",
	// The image content of the last image generated does not
	// match what the user wants
	USER_COMPLAINT_WRONG_CONTENT = "user_complaint_wrong-content",
}

/**
 * This function returns TRUE if the given value is a valid
 *   enumIntentDetectorId value, FALSE if not.
 */
export function isValidenumIntentDetectorId(enIntentDetectorId: string) {
	return Object.values(enumIntentDetectorId).includes(enIntentDetectorId as enumIntentDetectorId);
}

// -------------------- END  : enumIntentDetectorId ------------