import { Base, BaseFields } from "./Base";
import { KnownKeys } from "../../Util";

export interface ProgramSession extends Base {
    confKey?: string;
    title?: string;
    startTime?: number;
    endTime?: number;
}

export const ProgramSessionFields: Array<KnownKeys<ProgramSession>> = [
    ...BaseFields,
    "confKey",
    "title",
    "startTime",
    "endTime"
];
