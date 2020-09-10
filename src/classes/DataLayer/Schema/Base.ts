import { Conference } from "../Interface";

export default interface Base {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CachableBase {
    conference: Promise<Conference>;
}
