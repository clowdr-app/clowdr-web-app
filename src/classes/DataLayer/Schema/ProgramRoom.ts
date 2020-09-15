import { Base } from ".";
import { Conference, ProgramSession, TextChat, VideoRoom, ZoomRoom } from "../Interface";

export default interface Schema extends Base {
    name: string;

    conference: Promise<Conference>;
    sessions: Promise<Array<ProgramSession>>;
    textChat: Promise<TextChat | undefined>;
    videoRoom: Promise<VideoRoom | undefined>;
    zoomRoom: Promise<ZoomRoom | undefined>;
}
