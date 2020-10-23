import {Inject, Injectable, Renderer2, RendererFactory2} from '@angular/core';
import {DOCUMENT} from "@angular/common";

@Injectable()
export class OverlayService {

    private renderer: Renderer2;

    private overlay: any;

    private isSet: boolean = false;

    private isCreated: boolean = false;

    constructor(rendererFactory: RendererFactory2,
                @Inject(DOCUMENT) private document) {
        this.renderer = rendererFactory.createRenderer(null, null);
    }

    public setOverlay(text: string = "", background: string = "rgba(0, 0, 0, 0.4)"): void {
        if (!this.isSet) {
            this.overlay = this.renderer.createElement("div");

            const textNode = this.renderer.createText(text);
            this.renderer.appendChild(this.overlay, textNode);

            this.renderer.setAttribute(this.overlay, "class", "overlay");
            this.renderer.setStyle(this.overlay, "background", background);
            this.renderer.appendChild(this.document.body, this.overlay);

            this.isSet = true;
        } else {
            this.resetOverlay();
            this.setOverlay(text, background);
        }
    }

    public resetOverlay(): void {
        if (this.isSet) {
            this.renderer.removeChild(this.document.body, this.overlay, true);
            this.isSet = false;
        }
    }
}
