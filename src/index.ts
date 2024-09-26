import 'dotenv/config';

import fastify, { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyStatic, { FastifyStaticOptions } from '@fastify/static';
import websock from './websock';
import { readFileSync } from 'fs';
import path from 'node:path';

const port = Number(process.env.BACKEND_SERVER_PORT ?? 3001);
const host = '0.0.0.0';

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

const staticPath = '../frontend-static';
console.log('Current working directory at time of static path configuration:', process.cwd());
console.log('Resolved static file path:', path.join(__dirname, staticPath));

// Serve static files from the correct directory for the front-end
const staticOptions: FastifyStaticOptions = {
	root: path.join(__dirname, staticPath),
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
	app.log.info(`Storytime version 1.6 backend server listening on ${address}`);
	console.log(`Storytime backend server listening for websocket traffic on ${host}:${port}`);
});
