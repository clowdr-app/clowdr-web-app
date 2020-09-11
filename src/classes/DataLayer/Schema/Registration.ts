import { Base } from ".";

export default interface Schema extends Base {
    affiliation: string;
    country: string;
    email: string;
    invitationSentDate: number;
    name: string;
}
