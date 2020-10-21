import http from "http";
import express from "express";
import WebSocket from "ws";

function getRandomInteger(from, to) {
    const intFrom = Math.ceil(from);
    const intTo = Math.floor(to);
    return Math.floor(Math.random() * (intTo - intFrom + 1) + intFrom);
}

function getRandomPlayer() {
    return getRandomInteger(1, 2) === 1 ? "player1" : "player2";
}

function generateRoundData() {
    return {
        type: "RoundStarted",
        currentPlayer: getRandomPlayer(),
        playersCoordinates: {
            player1: getRandomInteger(50, 550),
            player2: getRandomInteger(50, 550),
        },
        gameFieldSize: {
            width: 600,
            height: 300
        },
        groundCoordinates: {
            x1: 50,
            y1: 250,
            x2: 550,
            y2: 250
        },
        cannonWidth: 20,
        cannonballWidth: 8,
    };
}

function sendToAllClients(webSocketServer, message) {
    webSocketServer.clients.forEach(ws => {
        ws.send(JSON.stringify(message));
    })
}

const server = http.createServer(express());
const wsServer = new WebSocket.Server({server}, () => console.log("The callback from the websocket server has been run"));

const MAX_AVAILABLE_CLIENTS = 2;

/**
 * 1 - awaiting for 2 clients
 * 2 - awaiting for 1 client
 * 3 - awaiting for a 1st client shot
 * 4 - awaiting for a 2nd client shot
 * @type {1 | 2 | 3 | 4}
 */
let gameState = 1;
let connectedClients = 0;
let currentRoundData;

wsServer.on("connection", ws => {
    console.log("a client is connected");
    if (++connectedClients === 1) {
        gameState = 2;
    } else if (connectedClients === MAX_AVAILABLE_CLIENTS) {
        gameState = 3;
        currentRoundData = currentRoundData ? currentRoundData : generateRoundData();
        wsServer.clients.forEach(ws => {
            ws.send(JSON.stringify(currentRoundData));
        })
    }

    ws.isAlive = true;

    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on("message", message => {
        console.log("Got a message:", message);
    });

    ws.on("close", message => {
        console.log("Client connection is closed:", message);
        --connectedClients;
        currentRoundData = null;
        wsServer.clients.forEach(ws => {
            ws.send(JSON.stringify({
                type: "Awaiting"
            }));
        });
    });
});

const checkActiveClientsInterval = setInterval(() => {
    console.log(`Number of connected clients: ${wsServer.clients.size}`);
    wsServer.clients.forEach((ws) => {
        if (!ws.isAlive) {
            console.log("a client is terminated");
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping(null, false, true);
    });
}, 5000);

server.listen(3000, () => console.log(`The server has been started on port ${server.address().port}`));
