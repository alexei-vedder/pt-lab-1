import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {OverlayService} from "./overlay.service";

@NgModule({
    declarations: [
        AppComponent
    ],
    imports: [
        BrowserModule
    ],
    providers: [
        OverlayService
    ],
    bootstrap: [AppComponent]
})
export class AppModule {
}
