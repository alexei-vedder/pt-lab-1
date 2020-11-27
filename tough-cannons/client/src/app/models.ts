export interface LineCoordinates {
    x1: number,
    y1: number,
    x2: number,
    y2: number
}

export interface CircleCoordinates {
    x: number,
    y: number
}

export interface GameFieldSize {
    width: number,
    height: number
}

export interface ScoreTableEntity {
    nickname: string,
    score: number
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
