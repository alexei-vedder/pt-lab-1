import * as http from "http";
import * as express from "express";
import * as WebSocket from "ws";
import {cos, sin, unit} from "mathjs";
import {RoundData} from "./models";

const MAX_AVAILABLE_PLAYERS = 2;
const GAME_FIELD_SIZE = {
    width: 600,
    height: 300
};
const GROUND_COORDINATES = {
    x1: 50,
    y1: GAME_FIELD_SIZE.height - 50,
    x2: GAME_FIELD_SIZE.width - 50,
    y2: GAME_FIELD_SIZE.height - 50
}
const CANNON_WIDTH = 20;
const CANNONBALL_WIDTH = 8;
const G = 10;
const V0 = 71;

/**
 * a generated integer belongs to [from, to] range
 * @param from: number
 * @param to: number
 * @returns {number}
 */
function generateInteger(from: number, to: number): number {
    const intFrom = Math.ceil(from);
    const intTo = Math.floor(to);
    return Math.floor(Math.random() * (intTo - intFrom + 1) + intFrom);
}

function generateId(): string {
    return generateInteger(0, 100_000).toString();
}

function getRandomPlayerId(players): string {
    const playersIds = Object.keys(players);
    const randomIndex = generateInteger(0, playersIds.length - 1);
    return playersIds[randomIndex];
}

function generateRoundData(players): RoundData {

    const playersCoordinates = {};
    const playersIds = Object.keys(players);

    playersIds.forEach(id => {
        playersCoordinates[id] = generateInteger(GROUND_COORDINATES.x1, GROUND_COORDINATES.x2);
    });

    return {
        type: "RoundStarted",
        currentPlayerId: getRandomPlayerId(players),
        gameFieldSize: GAME_FIELD_SIZE,
        groundCoordinates: GROUND_COORDINATES,
        cannonWidth: CANNON_WIDTH,
        cannonballWidth: CANNONBALL_WIDTH,
        g: G,
        v0: V0,
        playersCoordinates
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

function sendShotInfoToOpponents(playerId: string, angle: number): void {
    const opponentIds: string[] = Object.keys(players).filter(id => id !== playerId);
    opponentIds.forEach((id: string) => {
        players[id].send(JSON.stringify({
            type: "OpponentShot",
            angle
        }))
    })
}

/**
 * The system should be:
 * y = y0 - v0y * t + (g * t**2) / 2
 * x = x0 + v0x * t
 * but because in this case y = y0 the system becomes this:
 * t = 2 * v0y / g
 * x = x0 + v0x * t
 */
function isOpponentHit(coordinates: { [key: string]: number }, shooterId: string, angle: number): boolean {
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
const players = {};

wsServer.on("connection", (ws: WebSocket) => {
    console.log("a player is connected");

    const playerId = generateId();
    ws.send(JSON.stringify({
        type: "IdNotification",
        id: playerId
    }));

    if (Object.keys(players).length < MAX_AVAILABLE_PLAYERS - 1) {
        players[playerId] = ws;
    } else if (Object.keys(players).length === MAX_AVAILABLE_PLAYERS - 1) {
        players[playerId] = ws;
        currentRoundData = currentRoundData ? currentRoundData : generateRoundData(players);
        console.log("Current round data:", currentRoundData)
        wsServer.clients.forEach((ws: WebSocket) => {
            ws.send(JSON.stringify(currentRoundData));
        });
    }

    ws.isAlive = true;

    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on("message", (message: string) => {
        const data = JSON.parse(message);
        console.log("Got a message:", message, "from player", playerId);
        isOpponentHit(currentRoundData.playersCoordinates, playerId, data.angle);
        sendShotInfoToOpponents(playerId, data.angle);
    });

    ws.on("close", (message: string) => {
        console.log("Client connection is closed:", message);
        for (let id in players) {
            if (players[id] === ws) {
                delete players[id];
            }
        }
        currentRoundData = null;
        wsServer.clients.forEach((ws: WebSocket) => {
            ws.send(JSON.stringify({
                type: "Awaiting"
            }));
        });
    });
});

const checkActiveClientsInterval = setInterval(() => {
    checkActiveClients(wsServer);
}, 8000);

// @ts-ignore
server.listen(3000, () => console.log(`The server has been started on port ${server.address().port}`));
