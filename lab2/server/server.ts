import * as http from "http";
import * as express from "express";
import * as WebSocket from "ws";
import {cos, sin, unit} from "mathjs";
import {GameFieldSize, LineCoordinates, Player, RoundData} from "./models";


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
 * a generated integer belongs to [from, to] range
 */
function generateInteger(from: number, to: number): number {
    const intFrom = Math.ceil(from);
    const intTo = Math.floor(to);
    return Math.floor(Math.random() * (intTo - intFrom + 1) + intFrom);
}

function generateId(): string {
    return generateInteger(0, 100_000).toString();
}

function getRandomPlayerId(playersIds: string[]): string {
    const randomIndex = generateInteger(0, playersIds.length - 1);
    return playersIds[randomIndex];
}

function generatePlayersCoordinates(playersIds: string[]) {
    const playersCoordinates = {};
    playersIds.forEach(id => {
        playersCoordinates[id] = generateInteger(GROUND_COORDINATES.x1, GROUND_COORDINATES.x2);
    });
    return playersCoordinates;
}

function generateRoundData(players: Player[], shootingPlayerId?: string): RoundData {
    const playersIds = players.map(player => player.id);

    return {
        type: "RoundStarted",
        shootingPlayerId: shootingPlayerId ? shootingPlayerId : getRandomPlayerId(playersIds),
        playersCoordinates: generatePlayersCoordinates(playersIds),
        gameFieldSize: GAME_FIELD_SIZE,
        groundCoordinates: GROUND_COORDINATES,
        cannonWidth: CANNON_WIDTH,
        cannonballWidth: CANNONBALL_WIDTH,
        g: G,
        v0: V0
    };
}

function checkActiveClients(wsServer): void {
    console.log(`Number of connected clients: ${wsServer.clients.size}`);
    wsServer.clients.forEach((ws: WebSocket) => {
        if (!ws.isAlive) {
            console.log("a client is terminated");
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping(null, false, true);
    });
}

function sendToOpponent(players: Player[], currentPlayerWS: WebSocket, message: any): void {
    players.find(player => player.ws !== currentPlayerWS).ws.send(JSON.stringify(message));
}

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

const server = http.createServer(express());
const wsServer = new WebSocket.Server({server});

let currentRoundData: RoundData;
let players: Player[] = [];
let pendingPlayers: Player[] = [];

wsServer.on("connection", (ws: WebSocket) => {

    const playerId: string = generateId();
    console.log(`a player ${playerId} is connected`);


    ws.send(JSON.stringify({
        type: "IdNotification",
        id: playerId
    }));

    if (players.length < MAX_PLAYERS_NUMBER) {
        players.push({
            ws,
            id: playerId
        });
    } else {
        pendingPlayers.push({
            ws,
            id: playerId
        });
    }

    if (players.length === MAX_PLAYERS_NUMBER) {
        currentRoundData = currentRoundData ? currentRoundData : generateRoundData(players);
        console.log("Current round data:", currentRoundData);
        players.forEach((player: Player) => {
            player.ws.send(JSON.stringify(currentRoundData));
        });
    }

    ws.isAlive = true;

    ws.on('pong', () => {
        ws.isAlive = true;
    });

    /**
     * a client always sends messages only about his shot
     */
    ws.on("message", (message: string) => {
        const data = JSON.parse(message);
        sendToOpponent(players, ws, {
            type: "OpponentShot",
            angle: data.angle
        });
        console.log("Got a message:", message, "from player", playerId);

        if (isOpponentKilled(currentRoundData.playersCoordinates, playerId, data.angle)) {
            ws.send(JSON.stringify({
                type: "HaveKilled",
                doubleTimeout: TIMEOUT_AFTER_SHOT
            }));
            sendToOpponent(players, ws, {
                type: "IsKilled",
                doubleTimeout: TIMEOUT_AFTER_SHOT
            });
        } else {
            ws.send(JSON.stringify({
                type: "SlipUp",
                doubleTimeout: TIMEOUT_AFTER_SHOT
            }));
            sendToOpponent(players, ws, {
                type: "IsNotKilled",
                doubleTimeout: TIMEOUT_AFTER_SHOT
            });
        }

        setTimeout(() => {
            const nextShootingPlayerId = players.find((player: Player) => currentRoundData.shootingPlayerId !== player.id).id
            currentRoundData = generateRoundData(players, nextShootingPlayerId);
            console.log("Current round data:", currentRoundData);
            players.forEach((player: Player) => {
                player.ws.send(JSON.stringify(currentRoundData));
            });
        }, TIMEOUT_AFTER_SHOT);
    });

    ws.on("close", (message: string) => {
        console.log("Client connection is closed:", message);
        players = players.filter(player => player.ws !== ws);
        pendingPlayers = pendingPlayers.filter(player => player.ws !== ws);
        currentRoundData = null;
        wsServer.clients.forEach((ws: WebSocket) => {
            ws.send(JSON.stringify({
                type: "Awaiting"
            }));
        });
        if (pendingPlayers.length !== 0 && players.length < MAX_PLAYERS_NUMBER) {
            players.push(pendingPlayers.shift());
        }
        if (players.length === MAX_PLAYERS_NUMBER) {
            currentRoundData = generateRoundData(players);
            console.log("Current round data:", currentRoundData);
            players.forEach((player: Player) => {
                player.ws.send(JSON.stringify(currentRoundData));
            });
        }
    });
});

const checkActiveClientsInterval = setInterval(() => {
    checkActiveClients(wsServer);
}, 8000);

// @ts-ignore
server.listen(3000, () => console.log(`The server has been started on port ${server.address().port}`));
