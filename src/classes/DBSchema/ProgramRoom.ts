import { Base, BaseFields } from './Base';
import { KnownKeys } from '../Util';

export interface ProgramRoom extends Base {
    isEventFocusedRoom: boolean;
    name: string;

    id1: string;
    src1: string;
    pwd1: string;

    id2: string;
    src2: string;
    pwd2: string;

    qa: string;
}

export const ProgramRoomFields: Array<KnownKeys<ProgramRoom>> = [
    ...BaseFields,
    "isEventFocusedRoom",
    "name",
    "id1",
    "src1",
    "pwd1",
    "id2",
    "src2",
    "pwd2",
    "qa"
];
