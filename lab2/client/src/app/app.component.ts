import {Component, ElementRef, HostListener, OnInit, Renderer2, ViewChild} from '@angular/core';
import {atan2, cos, pi, sin, unit} from 'mathjs';
import {OverlayService} from "./overlay.service";
import {SERVER_ROUTE} from "../assets/route";

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

@Component({
    selector: 'app',
    template: `
        <main class="main-container">
            <svg #gameField
                 [attr.width]="gameFieldSize.width"
                 [attr.height]="gameFieldSize.height">

                <line #ground
                      [attr.x1]="groundCoordinates.x1"
                      [attr.y1]="groundCoordinates.y1"
                      [attr.x2]="groundCoordinates.x2"
                      [attr.y2]="groundCoordinates.y2"
                      stroke="black"
                      stroke-width="4px"/>

                <circle [attr.r]="cannonWidth / 2"
                        [attr.cx]="playersCoordinates['player1']"
                        [attr.cy]="groundCoordinates.y1"/>

                <circle [attr.r]="cannonWidth / 2"
                        [attr.cx]="playersCoordinates['player2']"
                        [attr.cy]="groundCoordinates.y1"/>


                <marker id="arrowhead"
                        markerWidth="10"
                        markerHeight="7"
                        refX="10"
                        refY="3.5"
                        orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7"/>
                </marker>

                <line #vector
                      [attr.x1]="vectorCoordinates.x1"
                      [attr.y1]="vectorCoordinates.y1"
                      [attr.x2]="vectorCoordinates.x2"
                      [attr.y2]="vectorCoordinates.y2"
                      marker-end="url(#arrowhead)"
                      stroke="grey"
                      stroke-width="2px"
                      stroke-dasharray="4"/>

                <circle #cannonball
                        style="display: none"
                        [attr.r]="cannonballWidth / 2"
                        [attr.cx]="cannonballCoordinates.x"
                        [attr.cy]="cannonballCoordinates.y"/>

            </svg>
        </main>
    `
})
export class AppComponent implements OnInit {

    public cannonWidth = 0;
    public cannonballWidth = 0;

    public gameFieldSize = {
        width: 600,
        height: 300
    }

    public groundCoordinates: LineCoordinates = {
        x1: 50,
        y1: 250,
        x2: 550,
        y2: 250
    };

    public vectorCoordinates: LineCoordinates = {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0
    };

    public cannonballCoordinates: CircleCoordinates = {
        x: 0,
        y: 0
    };

    public playersCoordinates = {
        "player1": 50,
        "player2": 550
    };

    private currentPlayer: "player1" | "player2";

    private isCannonballFlying: boolean = false;

    private webSocketConnection: WebSocket;

    @ViewChild("gameField")
    private gameField: ElementRef;

    @ViewChild("ground")
    private ground: ElementRef;

    @ViewChild("vector")
    private vector: ElementRef;

    @ViewChild("cannonball")
    private cannonball: ElementRef;

    constructor(private renderer: Renderer2,
                private overlayService: OverlayService) {
    }

    public ngOnInit() {
        this.webSocketConnection = new WebSocket(SERVER_ROUTE);

        this.webSocketConnection.onopen = () => {
            console.log("the connection is opened");
            this.overlayService.setOverlay("Awaiting for another player");
        }

        this.webSocketConnection.onclose = () => {
            console.log("the connection is closed");
        }

        this.webSocketConnection.onmessage = this.onMessageFromServer.bind(this);
    }

    @HostListener("mousemove", ["$event.target", "$event.pageX", "$event.pageY"])
    private calculateVectorCoordinates(target, pageX, pageY) {
        if (this.gameField.nativeElement === target) {
            const gameFieldRect: DOMRect = target.getBoundingClientRect();
            this.vectorCoordinates.x1 = this.playersCoordinates[this.currentPlayer];
            this.vectorCoordinates.y1 = this.groundCoordinates.y1;
            this.vectorCoordinates.x2 = pageX - gameFieldRect.x;
            this.vectorCoordinates.y2 = pageY - gameFieldRect.y;
        }
    }

    @HostListener("click", ["$event.target"])
    private shoot(target) {
        if (this.gameField.nativeElement === target && !this.isCannonballFlying) {
            const yRange = this.groundCoordinates.y2 - this.vectorCoordinates.y2;
            const xRange = this.vectorCoordinates.x2 - this.playersCoordinates[this.currentPlayer];
            const angle = atan2(yRange, xRange) * 180 / pi;
            this.animateCannonball(angle);
            this.sendShotInfo({angle});
        }
    }

    /**
     * @param angle: in degrees
     */
    private animateCannonball(angle: number) {

        this.startFlightAnimation();

        let t = 0;
        const deltaT = 0.1;
        const rerenderTimeout = 10;

        const {x, y} = this.generateFlightFunctions(angle);
        this.cannonballCoordinates = {
            x: x(t),
            y: y(t)
        };

        const flightInterval = setInterval(() => {
            if (this.cannonballCoordinates.y <= this.findGroundYCoordinate(this.cannonballCoordinates.x)) {
                this.cannonballCoordinates = {
                    x: x(t),
                    y: y(t)
                };
                t += deltaT;
            } else {
                this.finishFlightAnimation();
                clearInterval(flightInterval);
            }
        }, rerenderTimeout)
    }

    /**
     * @param angle: in degrees
     */
    private generateFlightFunctions(angle: number): { x: Function, y: Function } {
        const g = 10;
        const v0 = 71;

        const x0 = this.playersCoordinates[this.currentPlayer];
        const y0 = this.findGroundYCoordinate(x0);
        const v0x = v0 * cos(unit(angle, "deg"));
        const v0y = v0 * sin(unit(angle, "deg"));

        return {
            x: (t) => x0 + (v0x * t),
            y: (t) => y0 - (v0y * t) + (g * t ** 2) / 2
        }
    }

    /**
     * this method is needed for an ability to improve gameplay and create not flat ground or ground with an angle
     * now the method returns just y1 because of flat ground
     */
    private findGroundYCoordinate(x: number): number {
        return this.groundCoordinates.y1;
    }

    private startFlightAnimation(): void {
        this.isCannonballFlying = true;
        this.renderer.setStyle(this.cannonball.nativeElement, "display", "block");
    }

    private finishFlightAnimation(): void {
        this.renderer.setStyle(this.cannonball.nativeElement, "display", "none");
        this.isCannonballFlying = false;
        this.cannonballCoordinates = {
            x: 0,
            y: 0
        }
    }

    private sendShotInfo(data: {angle: number}) {
        this.webSocketConnection.send(JSON.stringify(data));
    }

    private onMessageFromServer(message: MessageEvent) {
        const data = JSON.parse(message.data);
        console.log(`a message from the server:`, data);

        if (data.type === "RoundStarted") {

            this.currentPlayer = data.currentPlayer;
            this.playersCoordinates = data.playersCoordinates;
            this.gameFieldSize = data.gameFieldSize;
            this.groundCoordinates = data.groundCoordinates;
            this.cannonWidth = data.cannonWidth;
            this.cannonballWidth = data.cannonballWidth;

            this.overlayService.resetOverlay();
        } else if (data.type === "Awaiting") {
            this.overlayService.setOverlay("Awaiting for another player")
        }
    }
}
