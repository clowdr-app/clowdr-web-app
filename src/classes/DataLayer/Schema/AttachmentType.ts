import { Base } from ".";
import { Conference } from "../Interface";

export default interface Schema extends Base {
    displayAsLink: boolean;
    extra: string | undefined;
    fileTypes: Array<any>;
    isCoverImage: boolean;
    name: string;
    ordinal: number | undefined;
    supportsFile: boolean;

    conference: Promise<Conference>;
}
