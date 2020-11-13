import React, { createContext, useContext } from "react";
import useScreenShareParticipant from "../../../hooks/useScreenShareParticipant/useScreenShareParticipant";
import useSelectedParticipant from "../useSelectedParticipant/useSelectedParticipant";

export const presentingContext = createContext<"presenting" | "not presenting">(null!);

export default function usePresenting() {
    return useContext(presentingContext);
}

type PresentingProviderProps = {
    children: React.ReactNode;
};

export function PresentingProvider({ children }: PresentingProviderProps) {
    const [selectedParticipant] = useSelectedParticipant();
    const screenShareParticipant = useScreenShareParticipant();

    return (
        <presentingContext.Provider
            value={selectedParticipant || screenShareParticipant ? "presenting" : "not presenting"}
        >
            {children}
        </presentingContext.Provider>
    );
}
