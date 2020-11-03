import { makeCancelable } from "@clowdr-app/clowdr-db-schema/build/Util";
import { DependencyList, useCallback, useEffect } from "react";

export default function useSafeAsync<T>(
    generator: () => Promise<T | undefined>,
    setState: (newState: T) => void,
    deps: DependencyList,
    debugOrigin: string): void {
    const generatorCallback = useCallback(generator, deps);
    const setStateCallback = useCallback(setState, []);

    // console.log(`useSafeAsync: called for ${debugOrigin}`);

    useEffect(() => {
        let cancel = () => { };

        async function execute() {
            try {
                //console.log(`useSafeAsync: started executing for ${debugOrigin}`);
                const p = makeCancelable(generatorCallback());
                cancel = p.cancel;
                const newV = await p.promise;
                if (newV !== undefined) {
                    //console.log(`useSafeAsync: Update from completed execution for ${debugOrigin}`);
                    setStateCallback(newV);
                }
                // else {
                //     console.log(`useSafeAsync: No update from completed execution for ${debugOrigin}`);
                // }
                cancel = () => { };
            }
            catch (e) {
                if (!e.isCanceled) {
                    throw e;
                }
            }
        }

        execute();

        return cancel;
    }, [debugOrigin, generatorCallback, setStateCallback]);
}
