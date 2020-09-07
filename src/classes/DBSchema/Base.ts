import { KnownKeys } from "../Util";

export interface Base {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}

export const BaseFields: Array<KnownKeys<Base>> = [
    "id",
    "createdAt",
    "updatedAt"
];
