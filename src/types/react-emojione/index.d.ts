declare module "react-emojione" {
    interface Options {
        convertShortnames?: boolean;
        convertUnicode?: boolean;
        convertAscii?: boolean;
        style?: { [x: string]: string },
        onClick?: (e: any) => void;
        output?: string;
    }

    export function emojify(s: string, options?: Options): string;
}
