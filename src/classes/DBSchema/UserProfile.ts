import { Base } from './Base';
import { User } from './User';
import { Conference } from './Conference';
import { Flair } from './Flair';
import { UserPresence } from './UserPresence';
import { ProgramPerson } from './ProgramPerson';
import { BreakoutRoom } from './BreakoutRoom';

export interface UserProfileTag {
    label: string;
    alwaysShow: boolean;
    priority: number;
    tooltip: string;
}

export interface UserProfile extends Base {
    id: string;
    conference: Conference;
    displayName: string;
    user: User;
    realName: string;
    tags: Array<UserProfileTag>;
    primaryFlair: Flair;
    webpage: string;
    affiliation: string;
    country: string;
    bio: string;
    pronouns: string;
    position: string;
    profilePhoto: any;
    isBanned: boolean;
    presence: UserPresence;
    programPersons: Array<ProgramPerson>;
    watchedRooms: Array<BreakoutRoom>;
    welcomeModalShown: boolean;
}
