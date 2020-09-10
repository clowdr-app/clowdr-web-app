import { Conference } from "../Interface";
import { Base } from ".";

export default interface Schema extends Base {
    displayAsLink: boolean;
    isCoverImage: boolean;
    name: string;
    ordinal: number;
    supportsFile: boolean;
    conference: Promise<Conference>;
}
