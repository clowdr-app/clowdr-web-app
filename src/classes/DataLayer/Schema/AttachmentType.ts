import { ProgramItem } from "../Interface";
import { NotPromisedFields } from "../../Util";
import { BaseFields, Base } from ".";

export default interface Schema extends Base {
    displayAsLink: boolean;
    isCoverImage: boolean;
    name: string;
    ordinal: number;
    supportsFile: boolean;

    programItem: Promise<ProgramItem | null>;
}

export const Fields: Array<keyof NotPromisedFields<Schema>> = [
    ...BaseFields,
    "displayAsLink",
    "isCoverImage",
    "name",
    "ordinal",
    "supportsFile"
];
