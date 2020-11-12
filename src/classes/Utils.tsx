import React from "react";
import { emojify } from "react-emojione";
import ReactPlayer from "react-player";
import ReactMarkdown from "react-markdown";

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

export function parseYouTubeURL(youtubeURL: string): string | undefined {
    // Regarding parsing youtube URLs:
    // See https://gist.github.com/rodrigoborgesdeoliveira/987683cfbfcc8d800192da1e73adc486
    // See https://regexr.com/531i0
    const youtubeIDParts = youtubeURL.matchAll(/(?:\/|%3D|v=|vi=)([0-9A-z-_]{11})(?:[%#?&]|$)/gi).next();
    if (youtubeIDParts) {
        return youtubeIDParts.value[1];
    }
    return undefined;
}

export function ReactMarkdownCustomised(props?: { children?: string; className?: string; linkColour?: string }): JSX.Element {
    const doEmojify = (val: any) => <>{emojify(val, { output: "unicode" })}</>;
    const renderEmoji = (text: any) => doEmojify(text.value);

    return (
        <ReactMarkdown
            className={props?.className}
            linkTarget="_blank"
            renderers={{
                text: renderEmoji,
                image: ({ src, alt }) => {
                    const youtubeVideoId = parseYouTubeURL(src);
                    if (youtubeVideoId) {
                        return (
                            <ReactPlayer
                                className="video-player"
                                width=""
                                height=""
                                playsinline
                                controls={true}
                                muted={false}
                                volume={1}
                                url={`https://www.youtube.com/watch?v=${youtubeVideoId}`}
                            />
                        );
                    }
                    else {
                        return <img src={src} alt={alt} />;
                    }
                },
                link: ({ href, children }: { href: string; children: JSX.Element }) => {
                    return (
                        <a href={href} style={{ color: props?.linkColour }}>
                            {children}
                        </a>
                    );
                }
            }}
            escapeHtml={true}
            source={props?.children}
        />
    );
}
