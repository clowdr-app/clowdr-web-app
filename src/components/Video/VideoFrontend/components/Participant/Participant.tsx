import React from "react";
import ParticipantInfo from "../ParticipantInfo/ParticipantInfo";
import ParticipantTracks from "../ParticipantTracks/ParticipantTracks";
import { Participant as IParticipant } from "twilio-video";
import { UserProfile } from "@clowdr-app/clowdr-db-schema";

interface ParticipantProps {
    participant: IParticipant;
    profile?: UserProfile;
    videoOnly?: boolean;
    enableScreenShare?: boolean;
    onClick?: () => void;
    isSelected?: boolean;
    isDominantSpeaker?: boolean;
    isLocalParticipant?: boolean;
    hideParticipant?: boolean;
    slot?: number;
    insideGrid: boolean;
    highlight?: boolean;
}

export default function Participant({
    participant,
    profile,
    videoOnly,
    enableScreenShare,
    onClick,
    isSelected,
    isLocalParticipant,
    hideParticipant,
    slot,
    insideGrid,
    highlight,
}: ParticipantProps) {
    return (
        <ParticipantInfo
            participant={participant}
            profile={profile}
            onClick={onClick}
            isSelected={isSelected}
            isLocalParticipant={isLocalParticipant}
            hideParticipant={hideParticipant}
            slot={slot}
            insideGrid={insideGrid}
            highlight={highlight}
        >
            <ParticipantTracks
                participant={participant}
                videoOnly={videoOnly}
                enableScreenShare={enableScreenShare}
                isLocalParticipant={isLocalParticipant}
            />
        </ParticipantInfo>
    );
}
