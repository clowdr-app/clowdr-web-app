import { makeCancelable } from "clowdr-db-schema/src/classes/Util";
import { DependencyList, useCallback, useEffect } from "react";

export default function useSafeAsync(f: () => Promise<void>, deps: DependencyList): void {
    let fC = useCallback(f, deps);

    useEffect(() => {
        let cancel = () => { };

        async function execute() {
            try {
                let p = makeCancelable(fC());
                cancel = p.cancel;
                await p.promise;
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
    }, [fC]);
}
