import {validate} from "jsonschema";

/**
 * a generated integer belongs to [from, to] range
 */
export function generateInteger(from: number, to: number): number {
    const intFrom = Math.ceil(from);
    const intTo = Math.floor(to);
    return Math.floor(Math.random() * (intTo - intFrom + 1) + intFrom);
}

export function generateId(): string {
    return generateInteger(0, 100_000).toString();
}

export function getRandomPlayerId(playersIds: string[]): string {
    const randomIndex = generateInteger(0, playersIds.length - 1);
    return playersIds[randomIndex];
}

export function validateShotInfoMessage(data: Object): boolean {
    const validation = validate(data, require("./schemas/shot-info-schema.json"));
    console.log("Shot info validation:", validation);
    return validation.valid;
}

export function validatePlayerNicknameMessage(data: Object): boolean {
    const validation = validate(data, require("./schemas/player-nickname-schema.json"));
    console.log("Player nickname validation:", validation)
    return validation.valid;
}

export function validateStatistics(data: Object): boolean {
    const validation = validate(data, require("./schemas/statistics-schema.json"));
    console.log("Shot info validation:", validation);
    return validation.valid;
}
