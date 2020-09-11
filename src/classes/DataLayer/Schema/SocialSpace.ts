import { Conference } from "../Interface";
import { Base } from ".";

export default interface Schema extends Base {
    chatChannel: string;
    isGlobal: boolean;
    name: string;

    conference: Promise<Conference>;
}
