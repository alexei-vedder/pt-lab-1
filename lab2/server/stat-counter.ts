import {StatEntity} from "./models";
import {FSWorker, JSONFileWorker} from "./fs-worker";
import {validateStatistics} from "./helpers";

export class StatCounter {

    private static readonly STATISTICS_FILE_PATH: string = "./statistics.json";

    private _fsWorker: FSWorker;

    private _statistics: StatEntity[] = [];

    public get statistics() {
        return this._statistics;
    }

    constructor() {
        this._fsWorker = new JSONFileWorker();
        this.loadStatistics();
    }

    public addNewNickname(nickname: string) {
        if (!this.statistics.find(entity => entity.nickname === nickname)) {
            this.statistics.push({
                nickname,
                score: 0
            });
            this.updateStatistics();
        }
    }

    public incrementScore(nickname, increment): void {
        const entity = this.statistics.find(entity => entity.nickname === nickname);
        entity.score += increment;
        this.updateStatistics();
    }

    private async loadStatistics(): Promise<void> {
        const statistics = await this._fsWorker.readDataFromFile(StatCounter.STATISTICS_FILE_PATH);
        if (validateStatistics(statistics)) {
            this._statistics = statistics;
        } else {
            throw new Error("Invalid statistics! " + statistics);
        }
    }

    private async updateStatistics(): Promise<void> {
        await this._fsWorker.writeDataToFile(this.statistics, StatCounter.STATISTICS_FILE_PATH);
    }
}
