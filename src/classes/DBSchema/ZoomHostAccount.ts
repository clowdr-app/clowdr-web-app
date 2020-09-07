import { Base, BaseFields } from './Base';
import { KnownKeys } from '../Util';

export interface ZoomHostAccount extends Base {
    email: string;
    name: string;
}

export const ZoomHostAccountFields: Array<KnownKeys<ZoomHostAccount>> = [
    ...BaseFields,
    "email",
    "name"
];
