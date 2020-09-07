import { Base } from './Base';

export interface LiveActivity extends Base {
    topic?: "privateBreakoutRooms" | "profile";
}
