import Parse from "parse";
import React, { useRef, useState } from "react";
import { ChromePicker, ColorResult } from "react-color";
import { addError, addNotification } from "../../../../classes/Notifications/Notifications";
import { handleParseFileURLWeirdness } from "../../../../classes/Utils";
import useConference from "../../../../hooks/useConference";
import useHeading from "../../../../hooks/useHeading";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import "./Sidebar.scss";

export default function AdminSidebar() {
    const defaultSidebarColour = "#761313";

    const conference = useConference();
    const [isSaving, setIsSaving] = useState(false);
    const fileRef = useRef<HTMLInputElement | null>(null);
    const [sidebarColour, setSidebarColour] = useState<string | null>(null);

    useHeading("Admin: Sidebar");

    useSafeAsync(
        async () => {
            const details = await conference.details;
            return details.find(x => x.key === "SIDEBAR_COLOUR")?.value ?? defaultSidebarColour;
        },
        setSidebarColour,
        [conference],
        "Admin/Sidebar:get SIDEBAR_COLOUR"
    );

    const logoURL = handleParseFileURLWeirdness(conference.headerImage);

    async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
        setIsSaving(true);
        try {
            const file = e.target.files?.item(0);
            if (file) {
                const data = new Uint8Array(await file.arrayBuffer());
                const parseFile = new Parse.File("photos-" + conference.id + "-" + file.name, [...data]);
                await parseFile.save();

                conference.headerImage = parseFile;
                await conference.save();
            }
        } catch {
            addError("Sorry, we were unable to save your logo. If this recurs, please contact the Clowdr team.");
        }
        setIsSaving(false);
    }

    async function removeLogo(ev: React.MouseEvent<HTMLButtonElement>) {
        ev.preventDefault();
        ev.stopPropagation();

        setIsSaving(true);
        try {
            conference.headerImage = undefined;
            // @ts-ignore - React doesn't want us to do this, but I can't see another way.
            fileRef.current.value = null;
            await conference.save();
        } catch {
            addError("Sorry, we were unable to remove your logo. If this recurs, please contact the Clowdr team.");
        }
        setIsSaving(false);
    }

    function changeSidebarColour(color: ColorResult, ev: React.ChangeEvent<HTMLInputElement>) {
        if (!isSaving) {
            setSidebarColour(color.hex);
        }
    }

    async function saveSidebarColour(color: ColorResult, ev: React.ChangeEvent<HTMLInputElement>) {
        if (!isSaving) {
            setIsSaving(true);
            let ok = false;

            try {
                ok = await Parse.Cloud.run("conference-setSidebarBgColour", {
                    colour: color.hex,
                    conference: conference.id,
                });
            } catch {
                ok = false;
            }

            setTimeout(() => {
                if (ok) {
                    addNotification("Sidebar colour saved.");
                } else {
                    addError(
                        "Sorry, we were unable to save your sidebar background colour. If this recurs, please contact the Clowdr team."
                    );
                }

                setIsSaving(false);
            }, 1 /*10000*/);
        }
    }

    const sidebarBgDisplayColour = !!sidebarColour ? sidebarColour : "#ffffff";
    return (
        <div className="admin-sidebar">
            <div
                className="logo"
                style={{
                    backgroundColor: sidebarBgDisplayColour,
                }}
            >
                {logoURL ? <img src={logoURL} alt={conference.shortName + " logo"} /> : <span>No logo.</span>}
                <div className="colour">
                    <span>Pick sidebar background colour</span>
                    <ChromePicker
                        className="logo-colour-input"
                        color={sidebarBgDisplayColour}
                        onChange={changeSidebarColour}
                        onChangeComplete={saveSidebarColour}
                    />
                </div>
                {isSaving ? (
                    <LoadingSpinner message="Saving" />
                ) : (
                    <div className="upload">
                        <input
                            name="logo"
                            id="logo"
                            type="file"
                            className="logo-input"
                            onChange={uploadLogo}
                            disabled={isSaving}
                            ref={fileRef}
                        />
                        <label htmlFor="logo" title={isSaving ? "Saving logo..." : undefined}>
                            Upload Logo
                        </label>
                        <button onClick={ev => removeLogo(ev)}>Remove logo</button>
                    </div>
                )}
            </div>
        </div>
    );
}
