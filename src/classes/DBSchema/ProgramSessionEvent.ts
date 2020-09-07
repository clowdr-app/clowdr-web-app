import { Base, BaseFields } from './Base';
import { KnownKeys } from '../Util';

export interface ProgramSessionEvent extends Base {
    directLink: string;
    endTime: number;
    startTime: number;
}

export const ProgramSessionEventFields: Array<KnownKeys<ProgramSessionEvent>> = [
    ...BaseFields,
    "directLink",
    "endTime",
    "startTime"
];
