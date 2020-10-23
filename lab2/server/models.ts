import * as WebSocket from "ws";

export interface Player {
    ws: WebSocket;
    id: string;
    name?: string
}

export interface RoundData {
    type: string,
    shootingPlayerId: string,
    gameFieldSize: { width: number, height: number },
    groundCoordinates: {
        x1: number,
        y1: number,
        x2: number,
        y2: number
    },
    cannonWidth: number,
    cannonballWidth: number,
    g: number,
    v0: number,
    playersCoordinates: {
        [key: string]: number
    }
}
