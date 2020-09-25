export default interface IMember {
    profileId: string;
    getOnlineStatus(): Promise<boolean>;
}
