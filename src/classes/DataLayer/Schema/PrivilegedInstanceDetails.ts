import { Conference } from "../Interface";
import { Base } from ".";

export default interface Schema extends Base {
    key: string;
    value: string;
    instance: Promise<Conference>;
}
