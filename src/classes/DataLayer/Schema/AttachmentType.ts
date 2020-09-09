import Base from "./Base";

export default interface AttachmentType extends Base {
    displayAsLink: boolean;
    isCoverImage: boolean;
    name: string;
    ordinal: number;
    supportsFile: boolean;

    programItem: Promise<string | null>; // TODO: Program item
}
