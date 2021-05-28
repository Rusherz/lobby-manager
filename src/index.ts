// Require the framework and instantiate it
import { Lobby } from "LoadBalancer"
import { spawn } from "child_process"
import { fastify as Fastify } from "fastify"

const fastify = Fastify({
	logger: true,
})

let startPort = 8888
let reaper: NodeJS.Timeout

const lobbies: Map<string, Lobby> = new Map()

lobbies.set("0", {
	name: "asd",
	maxPlayers: 0,
	numPlayers: 0,
	dirty: false,
	pid: 0,
	port: 0,
	host: "",
})

// List the current running lobbies
fastify.get("/lobbies", async (request, reply) => {
	const lobbyInfo = []

	for (let lobby of lobbies.values()) {
		lobbyInfo.push({
			...lobby,
			pid: undefined,
			dirty: undefined,
		})
	}

	reply.send(lobbyInfo)
})

function GetNextPort(): number {
	return startPort++
}

function reap() {
	reaper = setInterval(() => {
		console.info("Trying to reap game instances...")

		for (let lobby of lobbies.values()) {
			if (lobby.numPlayers == 0 && lobby.dirty && lobby.pid != 0) {
				try {
					process.kill(lobby.pid)
					lobbies.delete(lobby.host + lobby.port)
				} catch (error) {
					console.error(
						`Failed to reap lobby ${lobby.host + lobby.port}`
					)
					console.error(error)
				}
			}
		}
	}, 10 * 1000)
}

// spawnNewGameServer spawns a new game instance on the given port.
function spawnNewGameServer(port: number): Promise<number> {
	return new Promise((resolve, reject) => {
		try {
			console.info(`Trying to spawn game on port ${port}`)

			const proc = spawn(
				`/mnt/desktop/server-build/server.x86_64 -batchmode -nographics -server -port ${port} -logfile log_${port}.out`
			)

			proc.on("message", () => {
				console.info(`Just ran subprocess ${proc.pid} on port ${port}`)

				resolve(proc.pid)
			})

			proc.on("error", (error) => {
				console.error(error)

				resolve(-1)
			})
		} catch (error) {
			console.error(error)

			resolve(-1)
		}
	})
}

async function CreateGameServer(lobby: Lobby): Promise<Lobby> {
	lobby.port = GetNextPort()

	lobby.pid = await spawnNewGameServer(lobby.port)

	if (lobby.pid == -1) {
		return lobby
	}

	lobbies.set(lobby.host + lobby.port, lobby)

	return lobby
}

// Create a new lobby
fastify.post("/lobby", async (request, reply) => {
	let lobby: Lobby = request.body as Lobby

	lobby = await CreateGameServer(lobby)

	if (lobby.pid == -1) {
		reply.send({
			error: true,
		})
	} else {
		reply.send({ status: true })
	}
})

// Update a lobby
fastify.put("/lobby", async (request, reply) => {
	const body = request.body as Lobby

	const lobby: Lobby = {
		...body,
		pid: lobbies[body.host + body.port].pid,
		dirty: lobbies[body.host + body.port].dirty || body.numPlayers > 0,
	}

	lobbies.set(lobby.host + lobby.port, lobby)

	reply.send({ status: true })
})

// Run the server!
fastify.listen(3000, async function (err, address) {
	if (err) {
		fastify.log.error(err)
		process.exit(1)
	}

	fastify.log.info(`server listening on ${address}`)

	reap()

	if (
		(
			await CreateGameServer({
				name: "default",
				host: "default",
				maxPlayers: 0,
				numPlayers: 0,
				port: 0,
				pid: 0,
				dirty: false,
			})
		).pid == -1
	) {
		process.exit(1)
	}
})
