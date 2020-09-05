import { Base, BaseFields } from './Base';
import { KnownKeys } from '../../Util';

export interface ProgramTrack extends Base {
    badgeText?: string;
    badgeColor?: string;
    displayName?: string;
    exhibit?: "None" | "Grid" | "List";
    name?: string;
    perProgramItemChat?: boolean;
    perProgramItemVideo?: boolean;
    showAsEvents?: boolean;
}

export const ProgramTrackFields: Array<KnownKeys<ProgramTrack>> = [
    ...BaseFields,
    "badgeText",
    "badgeColor",
    "displayName",
    "exhibit",
    "name",
    "perProgramItemChat",
    "perProgramItemVideo",
    "showAsEvents"
];
