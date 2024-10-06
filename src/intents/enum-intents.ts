// This module contains the IDs for the intents we created and some other
//  elements related to changes we make because of detected intents.

// This is the number of steps to adjust an image generation
//  request by, up or down, based on feedback from the user.
export const NUM_STEPS_ADJUSTMENT_VALUE = 3;

// This is the amount to adjust the guidance scale during
// an image generation, up or down, based on feedback from the user.
export const NUM_GUIDANCE_SCALE_ADJUSTMENT_VALUE = 3;

// This is the minimum number of steps we will make an
//  image generation call with.
export const MIN_STEPS = 1;

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
	USER_COMPLAINT_IMAGE_QUALITY_OR_WRONG_CONTENT = "user_complaint_image_quality_or_content",
	// User is complaining about the generation speed.
	USER_COMPLAINT_IMAGE_GENERATION_SPEED = "user_complaint_speed_image_generation_speed",
	// User wants more creativity or variation
	USER_COMPLAINT_IMAGE_IS_BORING = "user_complaint_image_is_boring",
}

/**
 * This function returns TRUE if the given value is a valid
 *   enumIntentDetectorId value, FALSE if not.
 */
export function isValidEnumIntentDetectorId(enIntentDetectorId: string) {
	return Object.values(enumIntentDetectorId).includes(enIntentDetectorId as enumIntentDetectorId);
}

// -------------------- END  : enumIntentDetectorId ------------
