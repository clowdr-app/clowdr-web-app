import { Base } from './Base';
import { SocialSpace } from './SocialSpace';
import { ZoomRoom } from './ZoomRoom';
import { Conference } from './Conference';

export interface ProgramRoom extends Base {
    id: string;
    name: string;
    socialSpace: SocialSpace;
    id1: string;
    src1: string;
    pwd1: string;
    id2: string;
    src2: string;
    pwd2: string;
    qa: string;
    conference: Conference;
    zoomRoom: ZoomRoom;
    isEventFocusedRoom: boolean;
}
