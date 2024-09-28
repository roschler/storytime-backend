
// This module contains code to take the result object from
//  a segmenting call to Meta's SAM2 model and turn the
//  objects found into separate child images.
import sharp from 'sharp';

/**
 * Class for processing image segmentation results from SAM2.
 * It calculates bounding boxes from masks and crops the
 * source image accordingly.
 */
export class MetaSegmentToObjectImages {
	/**
	 * The path to the source image.
	 *
	 * @private
	 * @type {string}
	 */
	private sourceImagePath: string;

	/**
	 * @param {string} sourceImagePath - The path to the source image file.
	 */
	constructor(sourceImagePath: string) {
		const errPrefix = '(constructor) ';

		if (typeof sourceImagePath !== 'string' || sourceImagePath.length === 0) {
			throw new Error(`${errPrefix}Invalid source image path.`);
		}

		this.sourceImagePath = sourceImagePath;
	}

	/**
	 * Process SAM2 result, crop objects from the image based on masks,
	 * and save them as new image files.
	 *
	 * @param {SAM2Result} result - The SAM2 result object containing masks.
	 * @param {string} outputDir - The directory to save the cropped images.
	 *
	 * @returns {Promise<void>} - Resolves when all images are processed.
	 */
	public async processResult(result: SAM2Result, outputDir: string): Promise<void> {
		const errPrefix = '(processResult) ';

		if (!result || typeof result !== 'object') {
			throw new Error(`${errPrefix}The result object is invalid.`);
		}

		if (typeof outputDir !== 'string' || outputDir.length === 0) {
			throw new Error(`${errPrefix}The output directory is invalid.`);
		}

		const metadata = await this._getImageMetadata();

		if (typeof metadata.width !== 'number' || typeof metadata.height !== 'number') {
			throw new Error(`${errPrefix}Image width or height is undefined.`);
		}

		// Iterate over each object in the SAM2 result
		for (const obj of result.objects) {
			if (!obj.object_id || !obj.mask) {
				throw new Error(`${errPrefix}Invalid object structure.`);
			}

			// Call the updated bounding box function (image width and height no longer required)
			const bbox = this._getBoundingBoxFromMask(obj.mask);

			// Check if the bounding box has a valid size before proceeding
			if (bbox.width > 0 && bbox.height > 0) {
				await this._cropAndSaveImage(obj.object_id, bbox, outputDir);
			}
		}
	}

	/**
	 * Get the metadata of the source image.
	 *
	 * @private
	 * @returns {Promise<sharp.Metadata>} - Image metadata including width and height.
	 */
	private async _getImageMetadata(): Promise<sharp.Metadata> {
		const errPrefix = '(getImageMetadata) ';
		try {
			return await sharp(this.sourceImagePath).metadata();
		} catch (error) {
			throw new Error(`${errPrefix}Error reading image metadata: ${error.message}`);
		}
	}

	/**
	 * Calculate the bounding box from the mask.
	 *
	 * @private
	 * @param {number[][]} mask - A 2D array representing the mask.
	 *
	 * @returns {BoundingBox} - The bounding box with properties: minX, minY, width, height.
	 */
	private _getBoundingBoxFromMask(mask: number[][]): BoundingBox {
		const errPrefix = '(getBoundingBoxFromMask) ';

		if (!Array.isArray(mask) || mask.length === 0) {
			throw new Error(`${errPrefix}The mask is invalid.`);
		}

		let minX = Infinity, minY = Infinity;
		let maxX = -Infinity, maxY = -Infinity;

		// Loop through the mask to find the bounding box
		for (let y = 0; y < mask.length; y++) {
			for (let x = 0; x < mask[y].length; x++) {
				if (mask[y][x] === 1) { // Check for 'on' pixels
					if (x < minX) minX = x;
					if (y < minY) minY = y;
					if (x > maxX) maxX = x;
					if (y > maxY) maxY = y;
				}
			}
		}

		return {
			minX,
			minY,
			width: maxX - minX + 1,
			height: maxY - minY + 1,
		};
	}

	/**
	 * Crop the image to the bounding box and save it as a new file.
	 *
	 * @private
	 * @param {number} objectId - The ID of the object being processed.
	 * @param {BoundingBox} bbox - The bounding box to crop (minX, minY, width, height).
	 * @param {string} outputDir - The directory to save the cropped images.
	 *
	 * @returns {Promise<void>} - Resolves when the image is saved.
	 */
	private async _cropAndSaveImage(objectId: number, bbox: BoundingBox, outputDir: string): Promise<void> {
		const errPrefix = '(cropAndSaveImage) ';

		if (typeof objectId !== 'number') {
			throw new Error(`${errPrefix}Invalid object ID.`);
		}

		if (typeof outputDir !== 'string' || outputDir.length === 0) {
			throw new Error(`${errPrefix}Invalid output directory.`);
		}

		try {
			const outputPath = `${outputDir}/object-${objectId}.jpg`;
			await sharp(this.sourceImagePath)
				.extract({ left: bbox.minX, top: bbox.minY, width: bbox.width, height: bbox.height })
				.jpeg({ quality: 80 })
				.toFile(outputPath);
			console.log(`Saved object ${objectId} to file: ${outputPath}`);
		} catch (error) {
			throw new Error(`${errPrefix}Error cropping and saving image: ${error.message}`);
		}
	}
}

/**
 * Type for SAM2 result object.
 */
export interface SAM2Result {
	frame_index: number;
	objects: {
		object_id: number;
		mask: number[][];
	}[];
}

/**
 * Type for bounding box structure.
 */
export interface BoundingBox {
	minX: number;
	minY: number;
	width: number;
	height: number;
}
