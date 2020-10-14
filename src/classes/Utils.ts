export function daysIntoYear(date: Date) {
    return (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 24 / 60 / 60 / 1000;
}

export function handleParseFileURLWeirdness(parseFileFieldValue: any): string | null {
    if (parseFileFieldValue) {
        if ("url" in parseFileFieldValue) {
            return parseFileFieldValue.url();
        }
        else {
            return parseFileFieldValue._url;
        }
    }
    return null;
}

export function generateTimeText(startTime: number, now: number) {
    let distance = startTime - now;
    let units = "minutes";
    distance = Math.floor(distance / (1000 * 60)); // Convert to minutes
    if (distance >= 60) {
        distance = Math.floor(distance / 60);
        units = "hour" + (distance > 1 ? "s" : "");

        if (distance >= 24) {
            distance = Math.floor(distance / 24);
            units = "day" + (distance > 1 ? "s" : "");

            if (distance >= 7) {
                distance = Math.floor(distance / 7);
                units = "week" + (distance > 1 ? "s" : "");
            }
        }
    }
    return { distance, units };
}

export function isBelowMediumBreakpoint() {
    return window.matchMedia("(max-width: 768px)").matches;
}