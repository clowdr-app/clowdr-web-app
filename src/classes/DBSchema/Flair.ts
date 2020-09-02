import { Base } from './Base';

export interface Flair extends Base {
    color?: string;
    label?: string;
    tooltip?: string;
    priority?: number;
}
