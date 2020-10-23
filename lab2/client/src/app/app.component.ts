import {Component, ElementRef, HostListener, OnInit, Renderer2, ViewChild} from '@angular/core';
import {atan2, cos, pi, sin, unit} from 'mathjs';
import {OverlayService} from "./overlay.service";
import {SERVER_ROUTE} from "../assets/route";
import {CircleCoordinates, GameFieldSize, LineCoordinates} from "./models";


@Component({
    selector: 'app',
    templateUrl: "app.component.html"
})
export class AppComponent implements OnInit {

    public cannonWidth = 0;
    public cannonballWidth = 0;

    public gameFieldSize: GameFieldSize = {
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

    public playersCoordinates: {
        [playerId: string]: number
    };

    public isPendingShot: boolean = false;

    public selfId: string;

    public opponentId: string;

    private shootingPlayerId: string;

    private isCannonballFlying: boolean = false;

    /**
     * start speed (relative, doesn't affect real rendered cannonball speed)
     */
    private v0: number;

    /**
     * gravity constant
     */
    private g: number;

    private webSocketConnection: WebSocket;

    @ViewChild("gameField")
    private gameField: ElementRef;

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
        if (this.isPendingShot && this.gameField.nativeElement === target) {
            const gameFieldRect: DOMRect = target.getBoundingClientRect();
            this.vectorCoordinates = {
                x1: this.playersCoordinates[this.shootingPlayerId],
                y1: this.groundCoordinates.y1,
                x2: pageX - gameFieldRect.x,
                y2: pageY - gameFieldRect.y
            }
        } else {
            this.resetVectorCoordinates();
        }
    }

    @HostListener("click", ["$event.target"])
    private shoot(target) {
        if (this.isPendingShot && this.gameField.nativeElement === target && !this.isCannonballFlying) {
            this.isPendingShot = false;
            const yRange = this.groundCoordinates.y2 - this.vectorCoordinates.y2;
            const xRange = this.vectorCoordinates.x2 - this.playersCoordinates[this.shootingPlayerId];
            const angle = atan2(yRange, xRange) * 180 / pi;
            this.animateCannonball(angle);
            this.sendShotInfo({angle});
        }
    }

    private resetVectorCoordinates(): void {
        this.vectorCoordinates = {
            x1: 0,
            y1: 0,
            x2: 0,
            y2: 0
        };
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

        const flight = setInterval(() => {
            if (this.cannonballCoordinates.y <= this.findGroundYCoordinate(this.cannonballCoordinates.x)) {
                this.cannonballCoordinates = {
                    x: x(t),
                    y: y(t)
                };
                t += deltaT;
            } else {
                this.finishFlightAnimation();
                clearInterval(flight);
            }
        }, rerenderTimeout)
    }

    /**
     * @param angle: in degrees
     */
    private generateFlightFunctions(angle: number): { x: Function, y: Function } {

        const x0 = this.playersCoordinates[this.shootingPlayerId];
        const y0 = this.findGroundYCoordinate(x0);
        const v0x = this.v0 * cos(unit(angle, "deg"));
        const v0y = this.v0 * sin(unit(angle, "deg"));

        return {
            x: (t) => x0 + (v0x * t),
            y: (t) => y0 - (v0y * t) + (this.g * t ** 2) / 2
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

    private sendShotInfo(data: { angle: number }) {
        this.webSocketConnection.send(JSON.stringify(data));
    }

    private onMessageFromServer(message: MessageEvent) {
        const data = JSON.parse(message.data);
        console.log(`a message from the server:`, data);

        switch (data.type) {
            case "IdNotification": {
                this.selfId = data.id;
                console.log("My id is", this.selfId);
                break;
            }
            case "RoundStarted": {
                this.shootingPlayerId = data.shootingPlayerId;
                this.playersCoordinates = data.playersCoordinates;
                this.gameFieldSize = data.gameFieldSize;
                this.groundCoordinates = data.groundCoordinates;
                this.cannonWidth = data.cannonWidth;
                this.cannonballWidth = data.cannonballWidth;
                this.v0 = data.v0;
                this.g = data.g;

                this.resetVectorCoordinates();

                this.isPendingShot = this.shootingPlayerId === this.selfId;

                this.opponentId = Object.keys(this.playersCoordinates).find(id => id !== this.selfId);

                this.overlayService.resetOverlay();
                break;
            }
            case "Awaiting": {
                this.overlayService.setOverlay("Awaiting for another player");
                break;
            }
            case "OpponentShot": {
                this.animateCannonball(data.angle);
                break;
            }
            case "HaveKilled": {
                new Promise(() => {
                    setTimeout(() => {
                        this.overlayService.setOverlay("Nice shot!", "rgba(164, 238, 119, 0.4)")
                    }, data.doubleTimeout / 2);
                }).then(() => {
                    setTimeout(() => {
                        this.overlayService.resetOverlay();
                    }, data.doubleTimeout / 2);
                });
                break;
            }
            case "SlipUp": {
                new Promise(() => {
                    setTimeout(() => {
                        this.overlayService.setOverlay("Slip-up!", "rgba(246, 99, 99, 0.4)")
                    }, data.doubleTimeout / 2)
                }).then(() => {
                    setTimeout(() => {
                        this.overlayService.resetOverlay();
                    }, data.doubleTimeout / 2);
                });
                break;
            }
            case "IsKilled": {
                new Promise(() => {
                    setTimeout(() => {
                        this.overlayService.setOverlay("Killed!", "rgba(246, 99, 99, 0.4)")
                    }, data.doubleTimeout / 2)
                }).then(() => {
                    setTimeout(() => {
                        this.overlayService.resetOverlay();
                    }, data.doubleTimeout / 2);
                });
                break;
            }
            case "IsNotKilled": {
                new Promise(() => {
                    setTimeout(() => {
                        this.overlayService.setOverlay("You're lucky!", "rgba(246, 204, 99, 0.4)")
                    }, data.doubleTimeout / 2)
                }).then(() => {
                    setTimeout(() => {
                        this.overlayService.resetOverlay();
                    }, data.doubleTimeout / 2);
                });
                break;
            }
        }
    }
}
