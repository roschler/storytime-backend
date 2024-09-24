import "dotenv/config"

import fastify, { FastifyInstance } from "fastify"
import websock from "./websock"
import { readFileSync } from "fs"

const port = Number(process.env.BACKEND_SERVER_PORT ?? 3001)
const host = process.env.BACKEND_SERVER_HOST ?? "127.0.0.1"

let app: FastifyInstance
if (process.env.NODE_ENV !== "production") {
	console.log("Running in development mode, no SSL")
	app = fastify()
} else {
	const https = {
		key: readFileSync(process.cwd() + "/certs/server.key"),
		cert: readFileSync(process.cwd() + "/certs/server.crt"),
	}
	const opts = {
		logger: true,
		https,
	}
	app = fastify(opts)

	// HTTP health check route for AWS load balance.

	// Register a health check route
	app.get('/health', async (_request, reply) => {
		reply.status(200).send('OK');
	});

	// Start the server
	const start = async () => {
		try {
			await app.listen({ port: 3333, host: '0.0.0.0' });
			app.log.info(`Server listening on port 3333`);
		} catch (err) {
			app.log.error(err);
			process.exit(1);
		}
	};

	start();
}

// Websocket Controller
app.register(websock, { server: app.server })

app.listen({ port, host })

console.log(`Storytime backend server listening for websocket traffic on ${host}:${port}`)




