import 'dotenv/config';

import fastify, { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyStatic, { FastifyStaticOptions } from '@fastify/static';
// import websock from './websock-storytime';
import websock from './websock-chat-bot';

import { readFileSync } from 'fs';
import path from 'node:path';

const port = Number(process.env.BACKEND_SERVER_PORT ?? 3001);
const host = '0.0.0.0';

const appName = 'Chatbot';
const versionNum = '1.0';
const CONSOLE_CATEGORY = 'index page';

let app: FastifyInstance;

// Initialize Fastify instance
if (process.env.NODE_ENV !== 'production') {
	console.log('Running in development mode, no SSL');
	app = fastify({ logger: true });
} else {
	const https = {
		key: readFileSync(process.cwd() + '/certs/server.key'),
		cert: readFileSync(process.cwd() + '/certs/server.crt'),
	};
	const opts = {
		logger: true,
		https,
	};
	app = fastify(opts);
}

// TODO: Change this to an environment variable.
const staticPath = '../frontend-static';
console.log('Current working directory at time of static path configuration:', process.cwd());
console.log('Resolved static file path:', path.join(__dirname, staticPath));

// Serve static files from the correct directory for the front-end
const staticOptions: FastifyStaticOptions = {
	root: path.join(__dirname, staticPath),
	// TODO: Change these to environment variables.
	prefix: '/nft-supreme/', // Serve static files from the root URL path
	constraints: { host: 'plasticeducator.com' },
};

app.register(fastifyStatic, staticOptions);

// Log all requests to see what is happening
app.addHook('onRequest', (request, _reply, done) => {
	console.log(`Request URL: ${request.url}`);
	done();
});

// Register websocket plugin
app.register(websock, { server: app.server });

// Serve index.html at root
app.get('/', async (_request, reply) => {
	return reply.sendFile('index.html');
});

// Register the health check route for AWS load balancer
app.get('/health', async (_request, reply) => {
	return reply.status(200).send('OK');
});

// -------------------- BEGIN: TYPES NEEDED FOR TWITTER CARD ROUTE ------------

/**
 * Type definition for the query parameters expected in the request.
 */
interface TwitterCardQuery {
	card: string;
	title: string;
	description: string;
}

/**
 * Type definition for the route parameters (path parameters).
 */
interface TwitterCardParams {
	imageId: string;
}

// -------------------- END  : TYPES NEEDED FOR TWITTER CARD ROUTE ------------

/**
 * Type definition for the query parameters expected in the request.
 */
interface TwitterCardQuery {
	card: string;
	title: string;
	description: string;
	imageUrl: string;
}

/**
 * Type definition for the route parameters (path parameters).
 */
interface TwitterCardParams {
	imageId: string;
}

/**
 * Fastify route that generates a dynamic Twitter Card metadata page.
 *
 * @param {string} imageId - The ID of the image (from the URL path).
 * @param {string} card - The type of Twitter card (e.g., "summary_large_image").
 * @param {string} title - The title of the Twitter card. Must be a non-empty string.
 * @param {string} description - The description of the Twitter card. Must be a non-empty string.
 * @param {string} imageUrl - The URL of the image to display in the card. Must be a valid URL.
 * @returns {string} - Dynamically generated HTML page with Twitter Card metadata.
 * @throws {400} - Returns a 400 Bad request error if any of the required parameters are missing or invalid.
 */
app.get<{ Params: TwitterCardParams; Query: TwitterCardQuery }>('/twitter-card/:imageId', async (
	request: FastifyRequest<{
		Params: TwitterCardParams;
		Query: TwitterCardQuery;
	}>,
	reply: FastifyReply
) => {
	const { imageId } = request.params;
	const { card, title, description, imageUrl } = request.query as TwitterCardQuery;

	// -------------------- BEGIN: LOG REQUEST ------------

	console.log('\n----------------- TWITTER CARD REQUEST ------------\n')

	// Log the request headers
	console.log('Request Headers:', request.headers);

	// Inspect the user-agent to check if it's from Twitter
	const userAgent = request.headers['user-agent'];
	console.log('User-Agent:', userAgent);

	// Check for Twitter's bot specifically
	if (userAgent && userAgent.includes('Twitterbot')) {
		console.log('This request is coming from Twitterbot.');
	}

	// -------------------- END  : LOG REQUEST ------------

	// Validate imageId
	if (!imageId || typeof imageId !== 'string' || imageId.trim().length === 0) {
		return reply.code(400).send({ error: 'Invalid or missing imageId parameter.' });
	}

	// Validate card type
	if (!card || typeof card !== 'string' || card.trim().length === 0) {
		return reply.code(400).send({ error: 'Invalid or missing card parameter.' });
	}

	// Validate title
	if (!title || typeof title !== 'string' || title.trim().length === 0) {
		return reply.code(400).send({ error: 'Invalid or missing title parameter.' });
	}

	// Validate description
	if (!description || typeof description !== 'string' || description.trim().length === 0) {
		return reply.code(400).send({ error: 'Invalid or missing description parameter.' });
	}

	// Validate imageUrl
	if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim().length === 0) {
		return reply.code(400).send({ error: 'Invalid or missing imageUrl parameter.' });
	}

	console.info(CONSOLE_CATEGORY, `Serving up Twitter card for image ID: ${imageId}`)

	let parsedImageUrl: URL;
	try {
		parsedImageUrl = new URL(imageUrl);
	} catch (err) {
		return reply.code(400).send({ error: `imageUrl is not a valid URL: ${imageUrl}` });
	}

	const theSite = "https://plasticeducator.com/"
	const theCreator = "human_for_now"

	// Dynamically generate the HTML with Twitter Card metadata

	// NOTE: Forcing card format to "summary".
	const html = `
		<!DOCTYPE html>
		<html>
		<head>
			<meta name="twitter:card" content="summary">
			<meta name="twitter:title" content="${title}">
			<meta name="twitter:site" content="${theSite}">
			<meta name="twitter:description" content="${description}">
			<meta name="twitter:image" content="${parsedImageUrl.href}"> 
			<meta name="twitter:image:alt" content="${description}">
		</head>
		<body>
			<p>This page contains metadata for Twitter to display a rich preview of the image with ID: ${imageId}.</p>
		</body>
		</html>
	`;

	console.log(`HTML returned to user agent:\n${userAgent}\n`)
	console.log(`${html}`)

	// Serve the dynamically generated HTML
	reply.type('text/html').send(html);
});


// Wildcard route for front-end routing (must be after other routes)
app.setNotFoundHandler(async (request: FastifyRequest, reply: FastifyReply) => {
	console.log(`Route not found: ${request.url}`);
	return reply.sendFile('index.html');
});

// Start the server
app.listen({ port, host }, (err, address) => {
	if (err) {
		app.log.error(err);
		process.exit(1);
	}

	app.log.info(`${appName} version ${versionNum} backend server listening on ${address}`);
	console.log(`${appName} backend server listening for websocket traffic on ${host}:${port}`);
});
