import { Base } from './Base';

export interface ProgramSessionEvent extends Base {
    directLink?: string;
    endTime?: number;
    startTime?: number;
}
