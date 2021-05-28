export interface Lobby {
	//? name of the lobby, maybe?
	name: string

	// maxPlayers tells the maximum players that can join the lobby.
	maxPlayers: number

	// numPlayers tells the number of players currently connected to the lobby.
	numPlayers: number

	// host tells the address of the server hosting the lobby.
	host: string

	// port tells the port on which the server is hosting the lobby.
	port: number

	// pid tells the process id of lobby for cleanup
	pid: number

	// dirty tells wether or not the lobby should be detroyed when empty
	dirty: boolean
}
