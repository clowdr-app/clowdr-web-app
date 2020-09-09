import { AttachmentType } from "..";

const testConferenceId = "test_conference_id";
const testAttachmentTypeData = {
    id: "test_attachment_id",
    createdAt: new Date(),
    updatedAt: new Date(),

    displayAsLink: false,
    isCoverImage: false,
    name: "test name",
    ordinal: 0,
    supportsFile: false
};
const testObject
    = new AttachmentType(testConferenceId, testAttachmentTypeData);

describe("AttachmentType", () => {
    it("returns the displayAsLink", () => {
        expect(testObject.displayAsLink).toEqual(testAttachmentTypeData.displayAsLink);
    });

    it("returns the isCoverImage", () => {
        expect(testObject.isCoverImage).toEqual(testAttachmentTypeData.isCoverImage);
    });

    it("returns the name", () => {
        expect(testObject.name).toEqual(testAttachmentTypeData.name);
    });

    it("returns the ordinal", () => {
        expect(testObject.ordinal).toEqual(testAttachmentTypeData.ordinal);
    });

    it("returns the supportsFile", () => {
        expect(testObject.supportsFile).toEqual(testAttachmentTypeData.supportsFile);
    });

    it("returns the programItem", async () => {
        expect(await testObject.programItem).toBeTruthy();
    });

    it("returns the id", () => {
        expect(testObject.id).toEqual(testAttachmentTypeData.id);
    });
});
