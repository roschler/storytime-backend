import "dotenv/config";
import fastify, { FastifyInstance } from "fastify";
import websock from "./websock";
import { readFileSync } from "fs";

const port = Number(process.env.BACKEND_SERVER_PORT ?? 3001);
const host = "127.0.0.1";

let app: FastifyInstance;

// Initialize Fastify instance
if (process.env.NODE_ENV !== "production") {
	console.log("Running in development mode, no SSL");
	app = fastify();
} else {
	// Production mode
	const https = {
		key: readFileSync(process.cwd() + "/certs/server.key"),
		cert: readFileSync(process.cwd() + "/certs/server.crt"),
	};
	const opts = {
		logger: true,
		https,
	};
	app = fastify(opts);
}

// Register the websock plugin with a prefix to prevent route interference
app.register(websock, { prefix: '/storytime', server: app.server });

// Register the health check route for AWS load balancer
app.get('/health', async (_request, reply) => {
	reply.status(200).send('OK');
});

// Start the server
app.listen({ port, host }, (err, address) => {
	if (err) {
		app.log.error(err);
		process.exit(1);
	}
	app.log.info(`Storytime version 1.1 backend server listening on ${address}`);
	console.log(`Storytime backend server listening for websocket traffic on ${host}:${port}`);
});
