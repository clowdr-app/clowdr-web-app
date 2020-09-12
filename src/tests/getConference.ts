import { Conference } from "../classes/DataLayer";
import { testData } from "./setupTests";

export default async function getConference() {
    const conf = await Conference.get(testData.Conference[0].id);
    expect(conf).toBeDefined();
    return conf as Conference;
};
