// This module contains code that involves storing and
//  retrieving images to and from Amazon S3.

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import axios from "axios";
import { URL } from "url";

/**
 * Uploads an image from Livepeer to Amazon S3 under a user-specific folder.
 *
 * @param {string} userId - The ID of the user to whom the image belongs.
 * @param {string} livepeerImgUrl - The Livepeer image URL.
 *
 * @returns {Promise<string>} - The full S3 URI to the new asset.
 */
export async function putLivepeerImageToS3(userId: string, livepeerImgUrl: string): Promise<string> {
	// Validate and trim userId
	if (!userId || userId.trim().length === 0) {
		console.error(`Invalid userId: '${userId}'`);
		throw new Error("userId cannot be empty.");
	}
	const trimmedUserId = userId.trim();

	// Validate and parse livepeerImgUrl
	if (!livepeerImgUrl || livepeerImgUrl.trim().length === 0) {
		console.error(`Invalid livepeerImgUrl: '${livepeerImgUrl}'`);
		throw new Error("livepeerImgUrl cannot be empty.");
	}

	let parsedUrl: URL;
	try {
		parsedUrl = new URL(livepeerImgUrl);
	} catch (err) {
		console.error(`Invalid livepeerImgUrl: '${livepeerImgUrl}'`);
		throw new Error("livepeerImgUrl is not a valid URL.");
	}

	// Check that the protocol is HTTPS
	if (parsedUrl.protocol !== "https:") {
		console.error(`Invalid protocol for livepeerImgUrl: '${livepeerImgUrl}'`);
		throw new Error("livepeerImgUrl must use the HTTPS protocol.");
	}

	// Check that the hostname is obj-store.livepeer.cloud
	if (parsedUrl.hostname !== "obj-store.livepeer.cloud") {
		console.error(`Invalid host for livepeerImgUrl: '${livepeerImgUrl}'`);
		throw new Error("livepeerImgUrl must have the host 'obj-store.livepeer.cloud'.");
	}

	// Extract the image filename from the URL path
	const pathParts = parsedUrl.pathname.split("/");
	const filename = pathParts.slice(-2).join("/"); // Last two parts of the path form the filename
	if (!filename) {
		console.error(`Failed to extract filename from livepeerImgUrl: '${livepeerImgUrl}'`);
		throw new Error("Invalid livepeerImgUrl format, could not extract image filename.");
	}

	// Set up S3 client and bucket information
	const s3 = new S3Client({ region: "us-east-1" }); // Adjust the region as needed
	const bucketName = "nft3d-public-mp3";
	const s3Key = `livepeer-images/${trimmedUserId}/${filename}`;

	try {
		// Retrieve image content from Livepeer
		const response = await axios.get(livepeerImgUrl, { responseType: "arraybuffer" });
		const imageContent = response.data;

		// Upload the image content to S3
		await s3.send(new PutObjectCommand({
			Bucket: bucketName,
			Key: s3Key,
			Body: imageContent,
			ContentType: "image/png", // Assuming the image is PNG. Modify if needed.
		}));

		// Return the full S3 URI to the newly uploaded asset
		const s3Uri = `https://${bucketName}.s3.amazonaws.com/${s3Key}`;

		return s3Uri;
	} catch (error) {
		console.error(`Error uploading image to S3: ${error.message}`, { userId, livepeerImgUrl });
		throw new Error(`Failed to upload image to S3: ${error.message}`);
	}
}
