import { Base } from ".";
import { Conference } from "../Interface";

export default interface Schema extends Base {
    mirrored: boolean;
    name: string;
    twilioID: string;

    conference: Promise<Conference>;
}
