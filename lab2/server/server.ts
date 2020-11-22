import * as http from "http";
import * as express from "express";
import * as WebSocket from "ws";
import {cos, sin, unit} from "mathjs";
import {GameFieldSize, LineCoordinates, Player, RoundData, ServerMessage, ServerMessageType} from "./models";
import {
    generateId,
    generateInteger,
    getRandomPlayerId,
    validatePlayerNicknameMessage,
    validateShotInfoMessage
} from "./helpers";
import {StatCounter} from "./stat-counter";

const MAX_PLAYERS_NUMBER = 2;
const GAME_FIELD_SIZE: GameFieldSize = {
    width: 600,
    height: 300
};
const GROUND_COORDINATES: LineCoordinates = {
    x1: 50,
    y1: GAME_FIELD_SIZE.height - 50,
    x2: GAME_FIELD_SIZE.width - 50,
    y2: GAME_FIELD_SIZE.height - 50
};
const CANNON_WIDTH = 40;
const CANNONBALL_WIDTH = 15;
const G = 10;
const V0 = 71;
const TIMEOUT_AFTER_SHOT = 4000;


/**
 * The system should be:
 * y = y0 - v0y * t + (g * t**2) / 2
 * x = x0 + v0x * t
 * but because in this case y = y0 the system becomes this:
 * t = 2 * v0y / g
 * x = x0 + v0x * t
 */
function isOpponentKilled(coordinates: { [key: string]: number }, shooterId: string, angle: number): boolean {
    const v0y = V0 * sin(unit(angle, "deg"));
    const v0x = V0 * cos(unit(angle, "deg"));
    const fallTime = 2 * v0y / G;
    const xOfFall = coordinates[shooterId] + v0x * fallTime;
    const opponentId = Object.keys(coordinates).find(id => id !== shooterId);
    const coordinateOfOpponent = coordinates[opponentId];
    const leftOpponentKillZoneEdge = coordinateOfOpponent - (CANNON_WIDTH / 2) - (CANNONBALL_WIDTH / 2);
    const rightOpponentKillZoneEdge = coordinateOfOpponent + (CANNON_WIDTH / 2) + (CANNONBALL_WIDTH / 2);
    return leftOpponentKillZoneEdge < xOfFall && xOfFall < rightOpponentKillZoneEdge;
}

function generatePlayersCoordinates(playersIds: string[]) {
    const playersCoordinates = {};
    playersIds.forEach(id => {
        playersCoordinates[id] = generateInteger(GROUND_COORDINATES.x1, GROUND_COORDINATES.x2);
    });
    return playersCoordinates;
}

const server = http.createServer(express());
const wsServer = new WebSocket.Server({server});
const statCounter = new StatCounter();
let roundData: RoundData;
let players: Player[] = [];
let awaitingPlayers: Player[] = [];


const checkActiveClients = () => {
    console.log(`Number of connected clients: ${wsServer.clients.size}`);
    wsServer.clients.forEach((ws: WebSocket) => {
        if (!ws.isAlive) {
            console.log("a client is terminated");
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping(null, false, true);
    });
};

const sendToOpponent = (currentPlayerWS: WebSocket, message: any) => {
    players.find(player => player.ws !== currentPlayerWS).ws.send(JSON.stringify(message));
};

const generateRoundData = (shootingPlayerId?: string) => {
    const playersIds = players.map(player => player.id);

    return {
        shootingPlayerId: shootingPlayerId ? shootingPlayerId : getRandomPlayerId(playersIds),
        playersCoordinates: generatePlayersCoordinates(playersIds),
        gameFieldSize: GAME_FIELD_SIZE,
        groundCoordinates: GROUND_COORDINATES,
        cannonWidth: CANNON_WIDTH,
        cannonballWidth: CANNONBALL_WIDTH,
        g: G,
        v0: V0
    };
};

const sendToActivePlayers: (data: ServerMessage) => void = (data) => {
    players.forEach((player: Player) => {
        player.ws.send(JSON.stringify(data));
    });
};

const sendToAllPlayers: (data: ServerMessage) => void = (data) => {
    players.concat(...awaitingPlayers).forEach((player: Player) => {
        player.ws.send(JSON.stringify(data));
    });
};

const getPlayerNicknameById = (playerId) => {
    return players.find(player => player.id === playerId).nickname;
};

wsServer.on("connection", (ws: WebSocket) => {

    const playerId: string = generateId();
    console.log(`a player ${playerId} is connected`);


    ws.send(JSON.stringify({
        type: ServerMessageType.IdNotification,
        data: {
            id: playerId
        }
    }));

    if (players.length < MAX_PLAYERS_NUMBER) {
        players.push({
            ws,
            id: playerId
        });
    } else {
        awaitingPlayers.push({
            ws,
            id: playerId
        });
    }

    if (players.length === MAX_PLAYERS_NUMBER && !roundData) {
        roundData = generateRoundData();
        console.log("Round data:", roundData);
        sendToActivePlayers({
            type: ServerMessageType.RoundStarted,
            data: roundData
        });
    }

    sendToAllPlayers({
        type: ServerMessageType.Statistics,
        data: statCounter.statistics
    });

    ws.isAlive = true;

    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on("message", (message: string) => {
        const data = JSON.parse(message);
        console.log("Got a message:", message, "from player", playerId);

        if (validatePlayerNicknameMessage(data)) {
            const player = players.concat(...awaitingPlayers).find((player: Player) => player.ws === ws);
            player.nickname = data.nickname;
            statCounter.addNewNickname(data.nickname);
            sendToAllPlayers({
                type: ServerMessageType.Statistics,
                data: statCounter.statistics
            });
        } else if (validateShotInfoMessage(data)) {
            sendToOpponent(ws, {
                type: ServerMessageType.OpponentShot,
                data: {
                    angle: data.angle
                }
            });

            if (isOpponentKilled(roundData.playersCoordinates, playerId, data.angle)) {
                ws.send(JSON.stringify({
                    type: ServerMessageType.HaveKilled,
                    data: {
                        doubleTimeout: TIMEOUT_AFTER_SHOT
                    }
                }));
                sendToOpponent(ws, {
                    type: ServerMessageType.IsKilled,
                    data: {
                        doubleTimeout: TIMEOUT_AFTER_SHOT
                    }
                });
                statCounter.incrementScore(getPlayerNicknameById(playerId), 1);
            } else {
                ws.send(JSON.stringify({
                    type: ServerMessageType.SlipUp,
                    data: {
                        doubleTimeout: TIMEOUT_AFTER_SHOT
                    }
                }));
                sendToOpponent(ws, {
                    type: ServerMessageType.IsNotKilled,
                    data: {
                        doubleTimeout: TIMEOUT_AFTER_SHOT
                    }
                });
                statCounter.incrementScore(getPlayerNicknameById(playerId), -1);
            }

            setTimeout(() => {
                const nextShootingPlayerId = players.find((player: Player) => roundData.shootingPlayerId !== player.id).id
                roundData = generateRoundData(nextShootingPlayerId);
                console.log("Current round data:", roundData);
                sendToActivePlayers({
                    type: ServerMessageType.RoundStarted,
                    data: roundData
                });
                sendToAllPlayers({
                    type: ServerMessageType.Statistics,
                    data: statCounter.statistics
                });
            }, TIMEOUT_AFTER_SHOT);
        } else {
            console.warn(`Player ${playerId} sent a message of an unknown format: ${message}`)
        }
    });

    ws.on("close", (message: string) => {
        console.log("Client connection is closed:", message);
        players = players.filter(player => {
            if (player.ws !== ws) {
                return true;
            } else {
                roundData = null;
                return false
            }
        });
        awaitingPlayers = awaitingPlayers.filter(player => player.ws !== ws);

        if (players.length < MAX_PLAYERS_NUMBER) {
            sendToAllPlayers({
                type: ServerMessageType.Awaiting
            });

            if (awaitingPlayers.length !== 0) {
                players.push(awaitingPlayers.shift());

                if (players.length === MAX_PLAYERS_NUMBER) {
                    roundData = generateRoundData();
                    console.log("Current round data:", roundData);
                    sendToActivePlayers({
                        type: ServerMessageType.RoundStarted,
                        data: roundData
                    });
                    sendToAllPlayers({
                        type: ServerMessageType.Statistics,
                        data: statCounter.statistics
                    });
                }
            }
        }
    });
});

const checkActiveClientsInterval = setInterval(() => {
    checkActiveClients();
}, 8000);

// @ts-ignore
server.listen(3000, () => console.log(`The server has been started on port ${server.address().port}`));
