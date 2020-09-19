import { AttachmentType } from "..";
// import { KnownKeys } from "../../../Util";
// import * as Schema from "../../Schema";

/* 
 * 2020-09-09
 * A note on testing abstract classes
 *
 * In order to test the base class, we first need a concrete instance.
 * Unfortunately, the typical solution to testing abstract classes does not work
 * for the Base class. Ordinarily, I would create a custom concrete instance of
 * the abstract class as a mock for testing with. However, `Base` depends upon
 * its generic parameters being extensions of the schema. Without wanting to
 * over-complicate things (by parameterising Base by the schema), we therefore
 * need to use one of the actual concrete implementations. I have chosen
 * AttachmentType because it's what I'm using to prototype.
 * 
 * To test the inner (protected) functions of `Base`, we need access to them. So
 * `CustomAttachmentType` violates all known principles of goodness by taking
 * all the protected methods and making them public...I know, 'yikes'.
 */

class CustomAttachmentType extends AttachmentType {
}

const testConferenceId = "mockConference1";
const testAttachmentTypeData = {
    id: "mockAttachmentType1",
    createdAt: new Date(),
    updatedAt: new Date(),

    displayAsLink: false,
    isCoverImage: false,
    name: "test name",
    ordinal: 0,
    supportsFile: false,
    extra: "",
    fileTypes: [],
    conference: testConferenceId
};
const testObject
    = new CustomAttachmentType(testConferenceId, testAttachmentTypeData);

describe("Base", () => {
    it("returns the id", () => {
        expect(testObject.id).toEqual(testAttachmentTypeData.id);
    });

    it("returns the createdAt", () => {
        expect(testObject.createdAt).toEqual(testAttachmentTypeData.createdAt);
    });

    it("returns the updatedAt", () => {
        expect(testObject.createdAt).toEqual(testAttachmentTypeData.updatedAt);
    });
});
