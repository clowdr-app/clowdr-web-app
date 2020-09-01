import { Base } from './Base';
import { Conference } from "./Conference";

export interface InstanceConfiguration extends Base {
    key: string;
    value: string;

    instance: Conference;
}
