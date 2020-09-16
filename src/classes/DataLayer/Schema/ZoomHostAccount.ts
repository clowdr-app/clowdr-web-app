import { Base } from ".";
import { Conference } from "../Interface";

export default interface Schema extends Base {
    email: string;
    name: string;
    password: string;

    conference: Promise<Conference>;
}
