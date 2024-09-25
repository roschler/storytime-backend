import 'dotenv/config';

import fastify, { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"
import fastifyStatic, { FastifyStaticOptions } from '@fastify/static';
// import fastify from 'fastify';
// import fastifyStatic, { FastifyStaticOptions } from '@fastify/static';
import websock from './websock';
import { readFileSync } from 'fs';
import path from 'node:path';

const port = Number(process.env.BACKEND_SERVER_PORT ?? 3001);
// const host = '127.0.0.1';
const host = '0.0.0.0';

let app: FastifyInstance;

// Initialize Fastify instance
if (process.env.NODE_ENV !== 'production') {
	console.log('Running in development mode, no SSL');
	app = fastify({ logger: true });
} else {
	// Production mode
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

// Register fastify-helmet for security headers
/*
app.register(fastifyHelmet, {
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
		},
	},
});
*/

/*
app.register(fastifyHelmet, {
	helmet: {
		contentSecurityPolicy: false, // Adjust as necessary
	},
});
*/

// Serve static files from the frontend build directory
const frontendBuildPath = path.join(__dirname, '../frontend/dist');

const staticOptions: FastifyStaticOptions = {
	root: path.join(__dirname, 'public'),
	prefix: '/public/', // optional: default '/'
	constraints: { host: 'example.com' }, // optional: default {}
	allowedPath: (pathName: string, rootDir: string, _request: any) => {
		// Only allow files within the rootDir (build directory)
		const resolved = path.join(rootDir, pathName);
		return resolved.startsWith(rootDir);
	},
};

app.register(fastifyStatic, staticOptions);

// Register the `websock` plugin without a prefix.
// Remember, the websocket controller code in
// websock.ts in wsController() registers
// the "/storytime" path!
app.register(websock, { server: app.server });

// Serve index.html at root
app.get('/', async (_request, reply) => {
	reply.sendFile('index.html');
});

// Register the health check route for AWS load balancer
app.get('/health', async (_request, reply) => {
	reply.status(200).send('OK');
});

// Wildcard route for front-end routing (must be after other routes)
app.setNotFoundHandler(async (_request: FastifyRequest, reply: FastifyReply) => {
	// Serve index.html for unmatched routes (SPA support)
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
