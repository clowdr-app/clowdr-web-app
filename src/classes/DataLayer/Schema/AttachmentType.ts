import { ProgramItem } from "../Interface";
import { Base } from ".";

export default interface Schema extends Base {
    displayAsLink: boolean;
    isCoverImage: boolean;
    name: string;
    ordinal: number;
    supportsFile: boolean;

    programItem: Promise<ProgramItem | null>;
}
