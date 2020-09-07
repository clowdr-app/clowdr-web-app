import { Base } from './Base';

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
