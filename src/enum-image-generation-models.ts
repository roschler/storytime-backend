// This module contains code related to image generation models.

// -------------------- BEGIN: enumImageGenerationModelId ------------

// These are the IDs for each of the image generation model
//  IDs we currently support.

/**
 * Enum that contains all the image generation models we
 *  currently support.
 */
export enum enumImageGenerationModelId {
	// The ByteDance lightning model.
	LIGHTNING = "ByteDance/SDXL-Lightning",
	// The Black Forest FLUX model.
	FLUX = "black-forest-labs/FLUX.1-dev",
}

/**
 * This function returns TRUE if the given value is a valid
 *   enumIntentDetectorId value, FALSE if not.
 */
export function isValidEnumImageGenerationModelId(enImageGenerationModelId: string) {
	return Object.values(enumImageGenerationModelId).includes(enImageGenerationModelId as enumImageGenerationModelId);
}

// -------------------- END  : enumIntentDetectorId ------------

// Some defaults.
// This model leads to a service unavailable message: 502
// const DEFAULT_IMAGE_GENERATION_MODEL_ID = 'RealVisXL_V4.0_Lightning';
export const DEFAULT_IMAGE_GENERATION_MODEL_ID = enumImageGenerationModelId.LIGHTNING;
// If this value is empty, then we are not using a LoRA
//  model by default.
// const DEFAULT_LORA_MODEL_ID = '';
export const DEFAULT_GUIDANCE_SCALE = 7.5;
export const DEFAULT_NUMBER_OF_IMAGE_GENERATION_STEPS  = 20;


// Some helpful types.

/**
 * This interface describes the temporary objects we
 *  create from an of intent detector responses to
 *  help us with analyzing the detections.
 */
export interface IntentJsonResponseObject {
	intent_detector_id: string,
	array_child_objects: object[]
}

