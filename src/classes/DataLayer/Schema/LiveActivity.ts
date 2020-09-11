import { Base } from ".";

export type Topics = "privateBreakoutRooms" | "profile";

export default interface Schema extends Base {
    topic: Topics;
}
