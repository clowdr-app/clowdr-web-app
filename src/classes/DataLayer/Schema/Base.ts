import { NotPromisedFields } from "../../Util";

export default interface Base {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}

export const Fields: Array<keyof NotPromisedFields<Base>> = [
    "id",
    "createdAt",
    "updatedAt"
];
