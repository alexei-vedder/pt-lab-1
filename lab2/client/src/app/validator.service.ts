import {Injectable} from '@angular/core';
import {validate} from "jsonschema";
import serverMessageSchema from "../assets/schemas/server-message-schema.json";

@Injectable()
export class ValidatorService {
    public isServerMessageValid(data): boolean {
        console.log(validate(data, serverMessageSchema))
        return validate(data, serverMessageSchema).valid;
    }
}
