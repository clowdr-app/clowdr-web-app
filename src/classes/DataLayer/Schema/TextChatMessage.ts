import { Base } from ".";
import { TextChat } from "../Interface";

export default interface Schema extends Base {
    attributes: object | undefined;
    sentAt: Date;
    text: string;

    chat: Promise<TextChat>;
}
