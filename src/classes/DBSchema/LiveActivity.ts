import { Base, BaseFields } from './Base';
import { KnownKeys } from '../Util';

export interface LiveActivity extends Base {
    topic: "privateBreakoutRooms" | "profile";
}

export const LiveActivityFields: Array<KnownKeys<LiveActivity>> = [
    ...BaseFields,
    "topic"
];
