import { Base, BaseFields } from './Base';
import { KnownKeys } from '../../Util';

export interface ProgramPerson extends Base {
    confKey?: string;
    name?: string;
}

export const ProgramPersonFields: Array<KnownKeys<ProgramPerson>> = [
    ...BaseFields,
    "confKey",
    "name"
];
