import assert from "assert";
import Parse from "parse";
import React from "react";
import { addError, addNotification } from "../../../../../classes/Notifications/Notifications";
import useConference from "../../../../../hooks/useConference";
import AsyncButton from "../../../../AsyncButton/AsyncButton";
import { LoadingSpinner } from "../../../../LoadingSpinner/LoadingSpinner";
import { CompleteSpecs } from "../UploadFormatTypes";

interface Props {
    uploadProgress: false | null | number;
    programData: CompleteSpecs;
    setUploadProgress: (progress: false | null | number) => void;
}

export default function UploadTab(props: Props) {
    const conference = useConference();
    const uploadProgress = props.uploadProgress;

    return uploadProgress === null
        ? <LoadingSpinner message="Checking for existing progress" />
        : uploadProgress === false
            ? (
                <AsyncButton
                    action={async () => {
                        try {
                            assert(await Parse.Cloud.run("import-program", {
                                conference: conference.id,
                                data: props.programData
                            }));
                            addNotification("Upload started...");
                            props.setUploadProgress(0);
                        }
                        catch (e) {
                            addError(`Failed upload: ${e}`);
                        }
                    }}
                >Upload</AsyncButton>
            )
            : <>Upload progress: {uploadProgress}%</>;
}
