import {Inject, Injectable, Renderer2, RendererFactory2} from '@angular/core';
import {DOCUMENT} from "@angular/common";

@Injectable()
export class OverlayService {

    private renderer: Renderer2;

    private overlay: any;

    private isSet: boolean = false;

    constructor(rendererFactory: RendererFactory2,
                @Inject(DOCUMENT) private document) {
        this.renderer = rendererFactory.createRenderer(null, null);
    }

    public setOverlay(text?: string): void {
        this.generateOverlayElement(text);
        this.renderer.appendChild(this.document.body, this.overlay);
        this.isSet = true;
    }

    public resetOverlay(): void {
        if (this.isSet) {
            this.renderer.removeChild(this.document.body, this.overlay);
            this.isSet = false;
        }
    }

    private generateOverlayElement(text?: string) {
        this.overlay = this.renderer.createElement("div");
        if (text) {
            const textNode = this.renderer.createText(text);
            this.renderer.appendChild(this.overlay, textNode);
        }
        this.renderer.setAttribute(this.overlay, "class", "overlay");
    }
}
