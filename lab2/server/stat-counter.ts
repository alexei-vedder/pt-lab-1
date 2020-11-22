import {StatEntity} from "./models";

export class StatCounter {

    private _statistics: StatEntity[] = [];

    public get statistics() {
        return this._statistics;
    }

    public addNewNickname(nickname: string) {
        if (!this.statistics.find(entity => entity.nickname === nickname)) {
            this.statistics.push({
                nickname,
                score: 0
            });
        }
    }

    public incrementScore(nickname, increment) {
        const entity = this.statistics.find(entity => entity.nickname === nickname);
        entity.score += increment;
    }
}
