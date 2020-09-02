import { Base } from './Base';

// This is embedded in UserProfile and is not itself a table in the DB
export interface UserProfileTag {
    alwaysShow?: boolean;
    label?: string;
    priority?: number;
    tooltip?: string;
}

export interface UserProfile extends Base {
    affiliation?: string;
    bio?: string;
    country?: string;
    displayName?: string;
    isBanned?: boolean;
    position?: string;
    profilePhoto?: any;
    pronouns?: string;
    realName?: string;
    tags?: Array<UserProfileTag>;
    webpage?: string;
    welcomeModalShown?: boolean;
}
