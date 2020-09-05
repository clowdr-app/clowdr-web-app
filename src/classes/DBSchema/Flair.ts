import { Base, BaseFields } from './Base';
import { KnownKeys } from '../../Util';

export interface Flair extends Base {
    color?: string;
    label?: string;
    tooltip?: string;
    priority?: number;
}

export const FlairFields: Array<KnownKeys<Flair>> = [
    ...BaseFields,
    "color",
    "label",
    "tooltip",
    "priority"
];
