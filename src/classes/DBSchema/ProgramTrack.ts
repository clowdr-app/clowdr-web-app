import { Base } from './Base';
import { Conference } from './Conference';

export interface ProgramTrack extends Base {
    id: string;
    conference: Conference;
    name: string;
    displayName: string;
    perProgramItemChat: boolean;
    perProgramItemVideo: boolean;
    exhibit: "None" | "Grid" | "List";
    showAsEvents: boolean;
    badgeText: string;
    badgeColor: string;
}
