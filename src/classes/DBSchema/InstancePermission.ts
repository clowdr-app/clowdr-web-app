import { Base } from './Base';
import { Conference } from './Conference';
import { PrivilgedAction } from './PrivilgedAction';

export interface InstancePermission extends Base {
    action: PrivilgedAction;

    conference: Conference;
}
