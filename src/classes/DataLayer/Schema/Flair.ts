import { Base } from ".";
import { Conference } from "../Interface";

export default interface Schema extends Base {
    color: string;
    label: string;
    priority: number;
    tooltip: string;

    conference: Promise<Conference>;
}
