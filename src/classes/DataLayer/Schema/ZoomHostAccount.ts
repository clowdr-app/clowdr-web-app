import { Base } from ".";
import { Conference, ZoomRoom } from "../Interface";

export default interface Schema extends Base {
    email: string;
    name: string;
    password: string;

    conference: Promise<Conference>;
    rooms: Promise<Array<ZoomRoom>>;
}
