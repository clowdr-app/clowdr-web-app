import { Base } from ".";
import { Conference } from "../Interface";

export default interface Schema extends Base {
    key: string;
    value: string;
    conference: Promise<Conference>;
}
