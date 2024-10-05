// This is our quick, simple replacement for the jsonfile
//  package, which for some reason we can't use with our
//  repository.

import { promises as fs } from 'fs';

/**
 * Reads a JSON file.
 *
 * @param {string} filePath - The full path to the user's chat history JSON file.
 * @returns {Promise<any>} The parsed chat history from the JSON file.
 */
export async function readJsonFile(filePath: string): Promise<any> {
	try {
		if (filePath.trim().length < 1)
			throw new Error(`The filepath is empty or invalid.`);

		const data = await fs.readFile(filePath, 'utf-8');
		return JSON.parse(data);
	} catch (err) {
		throw new Error(`Failed to read file: ${err.message}`);
	}
}

/**
 * Writes the given item to a JSON file.
 *
 * @param {string} filePath - The full path to the JSON file.
 * @param {any} data - The data to write to the file.
 *
 * @returns {Promise<void>}
 */
export async function writeJsonFile(filePath: string, data: any): Promise<void> {
	try {
		if (filePath.trim().length < 1)
			throw new Error(`The filepath is empty or invalid.`);

		const jsonData = JSON.stringify(data, null, 2); // Pretty-print JSON with 2 spaces
		await fs.writeFile(filePath, jsonData, 'utf-8');
	} catch (err) {
		throw new Error(`Failed to write file: ${err.message}`);
	}
}
