import { Conference } from "../Interface";
import { Base } from ".";

export type Exhibits = "None" | "Grid" | "List";

export default interface Schema extends Base {
    badgeText: string;
    badgeColor: string;
    displayName: string;
    exhibit: Exhibits;
    name: string
    perProgramItemChat: boolean;
    perProgramItemVideo: boolean;
    showAsEvents: boolean;
    conference: Promise<Conference>;
}
