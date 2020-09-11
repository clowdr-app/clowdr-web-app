import {
    Conference, SocialSpace, ZoomRoom
} from "../Interface";
import { Base } from ".";

export default interface Schema extends Base {
    isEventFocusedRoom: boolean;
    name: string;
    id1: string;
    src1: string;
    pwd1: string;
    id2: string;
    src2: string;
    pwd2: string;
    qa: string;
    conference: Promise<Conference>;
    socialSpace: Promise<SocialSpace>;
    zoomRoom: Promise<ZoomRoom>;
}
