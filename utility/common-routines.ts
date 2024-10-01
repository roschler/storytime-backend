// This module contains some utility functions.

import * as fs from 'fs';

/**
 * Reads the given string content from the specified file path.
 *
 * @param {string} fullFilePath - The full path to the file.
 *
 * @returns {string | null} - Returns the contents of the file if
 *  it exists, or NULL if not.
 */
export function readTextFileSync(fullFilePath: string): string | null {
	const errPrefix = '(readTextFileSync) ';

	// Validate fullFilePath
	if (typeof fullFilePath !== 'string' || fullFilePath.trim() === '') {
		throw new Error(`${errPrefix}fullFilePath must be a non-empty string.`);
	}

	let fileContent: string | null = null;

	try {
		fileContent = fs.readFileSync(fullFilePath, 'utf8');
	} catch (err) {
		throw new Error(`${errPrefix}Failed to read file: ${(err as Error).message}`);
	}

	return fileContent;
}

/**
 * Writes the given string content to the specified file path.
 * The file path and content are validated for correctness.
 *
 * @param {string} fullFilePath - The full path to the file.
 * @param {string} strContent - The string content to write to the file.
 *
 * @returns {boolean} - Returns true on successful write, or
 *  throws an error if the operation fails.
 */
export function writeTextFileSync(fullFilePath: string, strContent: string): boolean {
	const errPrefix = '(writeTextFileSync) ';

	// Validate fullFilePath
	if (typeof fullFilePath !== 'string' || fullFilePath.trim() === '') {
		throw new Error(`${errPrefix}fullFilePath must be a non-empty string.`);
	}

	// Validate strContent
	if (typeof strContent !== 'string') {
		throw new Error(`${errPrefix}strContent must be a string.`);
	}

	try {
		fs.writeFileSync(fullFilePath, strContent, 'utf8');
		return true;
	} catch (err) {
		throw new Error(`${errPrefix}Failed to write to file: ${(err as Error).message}`);
	}
}

