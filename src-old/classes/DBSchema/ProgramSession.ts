import { Base } from "./Base";

export interface ProgramSession extends Base {
    confKey?: string;
    title?: string;
    startTime?: number;
    endTime?: number;
}
