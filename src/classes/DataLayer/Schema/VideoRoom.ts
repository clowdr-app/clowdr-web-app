import { Base } from ".";
import { Conference } from "../Interface";

export default interface Schema extends Base {
    capacity: number;
    ephemeral: boolean;
    name: string;
    twilioID: string;

    conference: Promise<Conference>;
}
