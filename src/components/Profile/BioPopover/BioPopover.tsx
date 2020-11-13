import { Flair, UserProfile } from "@clowdr-app/clowdr-db-schema";
import { Popover } from "@material-ui/core";
import React, { useState } from "react";
import useSafeAsync from "../../../hooks/useSafeAsync";
import FlairChip from "../FlairChip/FlairChip";
import "./BioPopover.scss";

interface Props {
    id: string;
    profile: UserProfile;
    open: boolean;
    anchorEl: Element | null;
    onClose: (event: {}, reason: "backdropClick" | "escapeKeyDown") => void;
}

export default function BioPopover(props: Props) {
    const [flairs, setFlairs] = useState<Flair[]>([]);
    useSafeAsync(() => props.profile.flairObjects, setFlairs, [], "BioPopover:setFlairs");
    return (
        <Popover
            id={props.id}
            style={{
                pointerEvents: "none"
            }}
            open={props.open}
            anchorEl={props.anchorEl}
            onClose={props.onClose}
            anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
            }}
            transformOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
            }}
            disableRestoreFocus
        >
            <div className="bio-popover">
                <div className="bio-pronouns">({props.profile.pronouns.reduce((acc,s) => `${acc} / ${s}`, "").substr(3)})</div>
                <div className="bio-affiliation">{props.profile.affiliation}</div>
                <div className="bio-bio">{props.profile.bio}</div>
                <div className="bio-flairs">{flairs.map(flair => <FlairChip flair={flair} key={flair.id} />)}</div>
            </div>
        </Popover>
    );
}
