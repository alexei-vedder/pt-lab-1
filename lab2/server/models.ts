import * as WebSocket from "ws";

export interface StatEntity {
    nickname: string;
    score: number;
}

export interface Player {
    ws: WebSocket;
    id: string;
    nickname?: string;
}

export interface LineCoordinates {
    x1: number,
    y1: number,
    x2: number,
    y2: number
}

export interface GameFieldSize {
    width: number,
    height: number
}

export interface RoundData {
    shootingPlayerId: string,
    gameFieldSize: GameFieldSize,
    groundCoordinates: LineCoordinates,
    cannonWidth: number,
    cannonballWidth: number,
    g: number,
    v0: number,
    playersCoordinates: {
        [playerId: string]: number
    }
}


export interface ServerMessage {
    type: ServerMessageType,
    data?: any
}

export enum ServerMessageType {
    IdNotification = "IdNotification",
    RoundStarted = "RoundStarted",
    Awaiting = "Awaiting",
    OpponentShot = "OpponentShot",
    HaveKilled = "HaveKilled",
    SlipUp = "SlipUp",
    IsKilled = "IsKilled",
    IsNotKilled = "IsNotKilled",
    Statistics = "Statistics"
}
