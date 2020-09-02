import { Base } from './Base';

export interface ProgramRoom extends Base {
    isEventFocusedRoom?: boolean;
    name?: string;

    id1?: string;
    src1?: string;
    pwd1?: string;

    id2?: string;
    src2?: string;
    pwd2?: string;

    qa?: string;
}
