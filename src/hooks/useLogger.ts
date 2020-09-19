import DebugLogger from "clowdr-db-schema/src/classes/DebugLogger";
import { useState } from "react";

export default function useLogger(componentName: string): DebugLogger {
    const [logger] = useState(new DebugLogger(componentName));
    return logger;
}
