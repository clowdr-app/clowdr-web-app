import { Base } from ".";

export default interface Schema extends Base {
    color: string;
    label: string;
    tooltip: string;
    priority: number;
}
