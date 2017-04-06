
import { StringParser } from './string_combinators'

export {
    Accessor,

    cache, byPosAndKey
}


type Accessor = (
        data: any,
        position: number,
        parser: StringParser<any, any>,
        value?: any
    ) => any;


function cache(accessor: Accessor, leftReplace: boolean): <E, T>(p: StringParser<E, T>) => StringParser<E, T> {
    return <E, T>(p: StringParser<E, T>): StringParser<E, T> => st => {
        const pos = st.getPosition();
        const data = st.getData();
        const cache = accessor(data, pos, p);

        if (cache && (cache.kind === 'right' || !leftReplace)) {
            return cache;
        }

        const val = p(st);

        // WARNING: mutation - set the value in the state
        accessor(data, pos, p, val);

        return val;
    };
}

function mkMap() {
    const map: { [key: string]: any } = Object.create(null);

    map['del me'] = 1;
    delete map['del me'];

    return map;
}

const EMPTY_MAP = mkMap();

function cacheChain(f: (parser: StringParser<any, any>, data: any) => any):
    (
        get: (data: any) => any,
        set: (data: any, value: any) => void
    ) => Accessor
{
    return (get, set) => (data, pos, p, val) => {
        const cache = get(data) || (val ? mkMap() : EMPTY_MAP);
        const entry = cache[pos];

        // getter
        if (val === undefined) {
            if (!entry) {
                return undefined;
            }

            const key = f(p, data);
            if (Array.isArray(entry)) {
                for (const pair of entry) {
                    if (pair.key === key) {
                        return pair.value;
                    }
                }

                return undefined;
            }

            return entry.key === key ? entry.value
                                     : undefined;
        }

        // setter
        const key = f(p, data);
        const kv = { key, value: val };
        if (!entry) {
            cache[pos] = kv;
            set(data, cache);
            return;
        }

        const arr = Array.isArray(entry) ? entry : [entry];
        for (const pair of arr) {
            if (pair.key === key) {
                if (pair.value.kind === 'right') {
                    throw new Error('ASSERT: right replacement encountered');
                }

                pair.value = val;
                return;
            }
        }

        arr.push(kv);
        cache[pos] = arr;
        return;
    };
}

export const byPosAndParser = cacheChain(x => x);

function byPosAndKey(
    get: (data: any) => any,
    set: (data: any, value: any) => any
): (key: string) => Accessor {
    return key => cacheChain(_ => key)(get, set);
}
