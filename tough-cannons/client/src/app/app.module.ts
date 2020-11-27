import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {OverlayService} from "./overlay.service";
import {ScoreTableComponent} from './score-table/score-table.component';
import {ValidatorService} from "./validator.service";

@NgModule({
    declarations: [
        AppComponent,
        ScoreTableComponent
    ],
    imports: [
        BrowserModule
    ],
    providers: [
        OverlayService,
        ValidatorService
    ],
    bootstrap: [AppComponent]
})
export class AppModule {
}
