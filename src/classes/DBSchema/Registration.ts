import { Base } from "./Base";

export interface Registration extends Base {
    affiliation: string;
    country: string;
    email: string;
    invitationSentDate: Date;
    name: string;
}
