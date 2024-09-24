import "dotenv/config"

import fastify, { FastifyInstance } from "fastify"
import websock from "./websock"
import { readFileSync } from "fs"

const port = Number(process.env.BACKEND_SERVER_PORT ?? 3001)
const host = process.env.BACKEND_SERVER_HOST ?? "127.0.0.1"

let app: FastifyInstance

// We use development mode for AWS because the ALB
//  handles SSL.
if (process.env.NODE_ENV !== "production") {
	console.log("Running in development mode, no SSL")
	app = fastify()

	// HTTP health check route for AWS load balance.

	// Register a health check route
	app.get('/health', async (_request, reply) => {
		reply.status(200).send('OK');
	});
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
}

// Websocket Controller
app.register(websock, { server: app.server })

app.listen({ port, host })

console.log(`Storytime backend server listening for websocket traffic on ${host}:${port}`)




