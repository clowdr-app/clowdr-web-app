import { Base } from "./Base";

export interface Registration extends Base {
    email: string;
    name: string;
    affiliation: string;
    country: string;
    invitationSentDate: Date;
}
