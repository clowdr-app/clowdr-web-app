import Parse from "parse";
import React, { useState } from "react";
import useHeading from "../../../../hooks/useHeading";
import "./WelcomePage.scss";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import useConference from "../../../../hooks/useConference";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import ReactMarkdown from "react-markdown";
import ReactMde from "react-mde";
import "react-mde/lib/styles/css/react-mde-all.css";
import { addError, addNotification } from "../../../../classes/Notifications/Notifications";

export default function AdminWelcomePage() {
    const conference = useConference();
    const [isSaving, setIsSaving] = useState(false);
    const [contents, setContents] = useState<string | null>(null);
    const [selectedTab, setSelectedTab] = useState<"write" | "preview">("write");

    useSafeAsync(
        async () => {
            const details = await conference.details;
            return details.find(x => x.key === "LOGGED_IN_TEXT")?.value ?? "Welcome.";
        },
        setContents,
        [conference],
        "Admin/WelcomePage:get LOGGED_IN_TEXT"
    );

    useHeading("Admin: Welcome page");

    async function* handleSaveImage(data: any) {
        yield "Pasting images not supported, please use a URL to an existing image instead.";
        return false;
    }

    async function doSave(ev: React.FormEvent<HTMLButtonElement>) {
        if (!isSaving) {
            setIsSaving(true);
            let ok = false;

            try {
                ok = await Parse.Cloud.run("conference-setLoggedInText", {
                    text: contents,
                    conference: conference.id,
                });
            } catch {
                ok = false;
            }

            setTimeout(() => {
                if (ok) {
                    addNotification("Welcome text saved.");
                } else {
                    addError(
                        "Sorry, we were unable to save your welcome text. If this recurs, please contact the Clowdr team."
                    );
                }

                setIsSaving(false);
            }, 1 /*10000*/);
        }
    }

    return (
        <div className="admin-welcome">
            {!contents ? (
                <LoadingSpinner />
            ) : isSaving ? (
                <LoadingSpinner message="Saving" />
            ) : (
                <>
                    <ReactMde
                        value={contents}
                        onChange={setContents}
                        selectedTab={selectedTab}
                        onTabChange={setSelectedTab}
                        generateMarkdownPreview={(markdown: string) =>
                            Promise.resolve(<ReactMarkdown linkTarget="_blank" escapeHtml={true} source={markdown} />)
                        }
                        childProps={{
                            writeButton: {
                                tabIndex: -1,
                            },
                        }}
                        paste={{
                            saveImage: handleSaveImage,
                        }}
                    />
                    <div className="save">
                        <button onClick={ev => doSave(ev)}>Save</button>
                    </div>
                </>
            )}
        </div>
    );
}
