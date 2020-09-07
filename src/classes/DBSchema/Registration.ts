import { Base, BaseFields } from "./Base";
import { KnownKeys } from "../Util";

export interface Registration extends Base {
    affiliation: string;
    country: string;
    email: string;
    invitationSentDate: number;
    name: string;
}

export const RegistrationFields: Array<KnownKeys<Registration>> = [
    ...BaseFields,
    "affiliation",
    "country",
    "email",
    "invitationSentDate",
    "name"
];
