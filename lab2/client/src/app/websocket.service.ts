import {Injectable} from '@angular/core';
import {SERVER_ROUTE} from "../assets/route";

@Injectable()
export class WebsocketService {

    private websocketConnection: WebSocket;

    constructor() {
        this.websocketConnection = new WebSocket(SERVER_ROUTE);

        this.websocketConnection.onopen = () => {
            console.log("the connection is opened");
        }

        this.websocketConnection.onclose = () => {
            console.log("the connection is closed");
        }

        this.websocketConnection.onmessage = this.onMessage;

    }

    public sendShootInfo(data: {angle: number}) {
        this.websocketConnection.send(JSON.stringify(data));
    }

    private onMessage(message: MessageEvent) {
        console.log(`a message from the server: ${message.data}`);

    }
}
