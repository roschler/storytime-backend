// This is our quick, simple replacement for the jsonfile
//  package, which for some reason we can't use with our
//  repository.

import fs from "fs"

/**
 * Reads a JSON file.
 *
 * @param {string} filePath - The full path to the user's chat history JSON file.
 *
 * @returns {Promise<any>} Returns the contents of the JSON file found
 *  with filePath, or NULL if no such file exists.
 */
export function readJsonFile(filePath: string): any | null {
	try {
		if (filePath.trim().length < 1)
			throw new Error(`The filepath is empty or invalid.`);

		const bIsExistingFile =
			fs.existsSync(filePath);

		if (!bIsExistingFile)
			return null;

		const data =  fs.readFileSync(filePath, 'utf-8');

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
export function writeJsonFile(filePath: string, data: any): void {
	try {
		if (filePath.trim().length < 1)
			throw new Error(`The filepath is empty or invalid.`);

		const jsonData = JSON.stringify(data, null, 2); // Pretty-print JSON with 2 spaces
		fs.writeFileSync(filePath, jsonData, 'utf-8');
	} catch (err) {
		throw new Error(`Failed to write file: ${err.message}`);
	}
}
