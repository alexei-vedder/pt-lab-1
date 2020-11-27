import {Component, Input} from '@angular/core';
import {ScoreTableEntity} from "../models";

@Component({
    selector: 'score-table',
    template: `
        <table>
            <thead>
            <th>Nickname</th>
            <th>Score</th>
            </thead>
            <tbody>
            <tr *ngFor="let scoreEntity of model">
                <td [ngStyle]="{'color': scoreEntity.nickname === selfNickname ? 'red' : 'inherit'}">
                    {{scoreEntity.nickname}}
                </td>
                <td>{{scoreEntity.score}}</td>
            </tr>
            </tbody>
        </table>
    `
})
export class ScoreTableComponent {

    private _model: ScoreTableEntity[] = [];

    @Input()
    public set model(value: ScoreTableEntity[]) {
        this._model = Array.isArray(value) ? value.sort((value1, value2) => {
            return value1.score < value2.score ? 1 : value1.score === value2.score ? 0 : -1;
        }) : [];
    }

    public get model(): ScoreTableEntity[] {
        return Array.isArray(this._model) ? this._model.slice(0, this.maxEntities) : [];
    }

    @Input()
    public maxEntities: number = Infinity;

    @Input()
    public selfNickname: string;
}
