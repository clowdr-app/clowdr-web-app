import { Base } from './Base';
import { ProgramItem } from './ProgramItem';
import { UserProfile } from './UserProfile';

export interface ProgramPerson extends Base {
    id: string;
    confKey: string;
    name: string;
    programItems: Array<ProgramItem>;
    userProfile: UserProfile;
}
