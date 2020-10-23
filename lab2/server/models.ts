export interface Player {

}

export interface RoundData {
    type: string,
    currentPlayerId: string,
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
