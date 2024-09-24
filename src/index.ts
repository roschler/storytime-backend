import "dotenv/config";
import fastify, { FastifyInstance } from "fastify";
import websock from "./websock";
import { readFileSync } from "fs";

const port = Number(process.env.BACKEND_SERVER_PORT ?? 3001);
const host = process.env.BACKEND_SERVER_HOST ?? "127.0.0.1";

let app: FastifyInstance;

// We use development mode for AWS because the ALB handles SSL.
if (process.env.NODE_ENV !== "production") {
	console.log("Running in development mode, no SSL");
	app = fastify();
} else {
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

// Health check route
app.get('/health', async (_request, reply) => {
	reply.status(200).send('OK');
});

// Register the WebSocket plugin AFTER the health check route
app.register(websock, { server: app.server });

// Lifecycle hook to ensure everything is set up before listening
app.ready(err => {
	if (err) {
		app.log.error(err);
		process.exit(1);
	}

	// Once the server is ready, start listening
	app.listen({ port, host }, (err, address) => {
		if (err) {
			app.log.error(err);
			process.exit(1);
		}
		app.log.info(`Server listening on ${address}`);
		console.log(`Storytime backend server listening for websocket traffic on ${host}:${port}`);
	});
});
