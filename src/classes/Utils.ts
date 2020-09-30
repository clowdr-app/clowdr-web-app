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
