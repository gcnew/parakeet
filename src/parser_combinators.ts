
export {
    /* Types */
    Parser, ParserStream,

    /* combinators */
    parseMap, parseMapError, parseMany,

    parseMaybe, parseTry, parseSatisfy,

    parseConst, parseFail,

    parseAlt, parseAlt3, parseAltUnsafe, parseChoice,

    parseCombine, parseCombine3, parseCombine4, parseCombineUnsafe,

    /* monadic binds */
    parseRecover, parseInspect,

    /* Auxiliary types */
    Left, Right, Either,

    /* helpers */
    left, right, pair
}

type Left<L>  = { kind: 'left',  value: L }
type Right<R> = { kind: 'right', value: R }

type Either<L, R> = Left<L> | Right<R>

interface ParserStream<S> {
    next(this: this): [S, this]|null;
}

type Parser<M, S extends ParserStream<M>, E, T> = (st: S) => Either<E, [T, S]>

type EosExpected = { kind: 'pc_error', code: 'eos_expected' }

function left<L>(value: L): Left<L> {
    return { kind: 'left', value };
}

function right<R>(value: R): Right<R> {
    return { kind: 'right', value };
}

function pair<F extends boolean|string|number|null|undefined|object, S>(fst: F, snd: S): [F, S] {
    return [fst, snd];
}

function parseMap<M, S extends ParserStream<M>, E, A, B>(p: Parser<M, S, E, A>, f: (a: A) => B): Parser<M, S, E, B> {
    return (st) => {
        const res = p(st);
        if (res.kind === 'left') {
            return res;
        }

        return right(pair(f(res.value[0]), res.value[1]));
    };
}

function parseMapError<M, S extends ParserStream<M>, E1, E2, T>(p: Parser<M, S, E1, T>, f: (e: E1) => E2): Parser<M, S, E2, T> {
    return (st) => {
        const res = p(st);
        if (res.kind === 'left') {
            return left(f(res.value));
        }

        return res;
    };
}

const eosExpected = left({ kind: 'pc_error', code: 'eos_expected' } as EosExpected);

export const parseEos: Parser<never, ParserStream<never>, EosExpected, void> = (st) => {
    if (st.next()) {
        return eosExpected;
    }

    return right(pair(undefined, st));
};

function parseConst<T>(x: T): Parser<never, never, never, T> {
    return (st) => {
        return right(pair(x, st));
    };
}

function parseFail<E>(e: E): Parser<never, never, E, never> {
    const error = left(e);
    return (_) => {
        return error;
    };
}

function parseAlt<M, S extends ParserStream<M>, E, A, B>(
    p1: Parser<M, S, {}, A>,
    p2: Parser<M, S, E, B>
): Parser<M, S, E, A|B> {
    return (st) => {
        const r1 = p1(st);
        if (r1.kind !== 'left') {
            return r1;
        }

        return p2(st);
    };
}

function parseAlt3<M, S extends ParserStream<M>, E, A, B, C>(
    p1: Parser<M, S, {}, A>,
    p2: Parser<M, S, {}, B>,
    p3: Parser<M, S, E, C>
): Parser<M, S, E, A|B|C> {
    return parseAltUnsafe([ p1, p2, p3 ]);
}

function parseAlt4<M, S extends ParserStream<M>, E, A, B, C, D>(
    p1: Parser<M, S, {}, A>,
    p2: Parser<M, S, {}, B>,
    p3: Parser<M, S, {}, C>,
    p4: Parser<M, S, E,  D>
): Parser<M, S, E, A|B|C|D> {
    return parseAltUnsafe([ p1, p2, p3, p4 ]);
}

function parseAltUnsafe<M, S extends ParserStream<M>>(parsers: Parser<M, S, any, any>[]): Parser<M, S, any, any> {
    if (!parsers.length) {
        throw new Error('No parsers provided');
    }

    return (st) => {
        let err;
        for (const p of parsers) {
            const res = p(st);
            if (res.kind !== 'left') {
                return res;
            }

            err = res;
        }

        return err!;
    };
}

function parseCombine<M, S extends ParserStream<M>, E1, E2, A, B, C>(
    p1: Parser<M, S, E1, A>,
    p2: Parser<M, S, E2, B>,
    f: (a: A, b: B) => C
): Parser<M, S, E1 | E2, C> {
    return parseCombineUnsafe([ p1, p2 ], f);
}

function parseCombine3<M, S extends ParserStream<M>, E1, E2, E3, A, B, C, D>(
    p1: Parser<M, S, E1, A>,
    p2: Parser<M, S, E2, B>,
    p3: Parser<M, S, E3, C>,
    f: (a: A, b: B, c: C) => D
): Parser<M, S, E1 | E2 | E3, D> {
    return parseCombineUnsafe([ p1, p2, p3 ], f);
}

function parseCombine4<M, S extends ParserStream<M>, E1, E2, E3, E4, A, B, C, D, F>(
    p1: Parser<M, S, E1, A>,
    p2: Parser<M, S, E2, B>,
    p3: Parser<M, S, E3, C>,
    p4: Parser<M, S, E4, D>,
    f: (a: A, b: B, c: C, d: D) => F
): Parser<M, S, E1 | E2 | E3 | E4, F> {
    return parseCombineUnsafe([ p1, p2, p3, p4 ], f);
}

function parseCombineUnsafe<M, S extends ParserStream<M>>(
    parsers: Parser<M, S, any, any>[],
    f: (...values: any[]) => any
): Parser<M, S, any, any> {
    if (!parsers.length) {
        throw new Error('No parsers provided');
    }

    return (st) => {
        let cur = st;
        const results: any[] = [];

        for (const p of parsers) {
            const res = p(cur);
            if (res.kind === 'left') {
                return res;
            }

            cur = res.value[1];
            results.push(res.value[0]);
        }

        return right(pair(f(...results), cur));
    };
}

function parseMany<M, S extends ParserStream<M>, E, A>(p: Parser<M, S, E, A>): Parser<M, S, never, A[]> {
    return (st) => {
        let cur = st;
        const results: A[] = [];

        while (true) {
            const res = p(cur);

            if (res.kind === 'left') {
                break;
            }

            cur = res.value[1];
            results.push(res.value[0])
        }

        return right(pair(results, cur));
    };
}

function parseMaybe<M, S extends ParserStream<M>, A>(p1: Parser<M, S, {}, A>): Parser<M, S, never, A|undefined> {
    return (st) => {
        const res = p1(st);

        if (res.kind === 'left') {
            return right(pair(undefined, st));
        }

        return res;
    };
}

function parseTry<M, S extends ParserStream<M>, E1, E2, A, B, C>(
    p1: Parser<M, S, E1, A>,
    p2: Parser<M, S, E2, B>,
    f: (a: A, b: B) => C
): Parser<M, S, E2, C|undefined> {
    return (st) => {
        const res = p1(st);

        if (res.kind === 'left') {
            return right(pair(undefined, st));
        }

        const res2 = p2(res.value[1]);
        if (res2.kind === 'left') {
            return res2;
        }

        return right(pair(f(res.value[0], res2.value[0]), res2.value[1]));
    };
}

function parseRecover<M, S extends ParserStream<M>, E1, E2, A, B>(
    p1: Parser<M, S, E1, A>,
    f: (e: E1) => Parser<M, S, E2, B>
): Parser<M, S, E2, A | B> {
    return (st) => {
        const res = p1(st);
        if (res.kind === 'right') {
            return res;
        }

        return f(res.value)(st);
    };
}

function parseInspect<M, S extends ParserStream<M>, E1, E2, A, B>(
    p1: Parser<M, S, E1, A>,
    f: (e: A) => Parser<M, S, E2, B>
): Parser<M, S, E1 | E2, B> {
    return (st) => {
        const res = p1(st);
        if (res.kind === 'left') {
            return res;
        }

        return f(res.value[0])(st);
    };
}

function parseSatisfy<M, S extends ParserStream<M>, E>(f: (x: M) => boolean, e: E): Parser<M, S, E, M> {
    const error = left(e);
    return (st) => {
        const res = st.next();
        if (!res || !f(res[0])) {
            return error;
        }

        return right(res);
    };
}

function parseChoice<M, S extends ParserStream<M>, E1, E2, E3, E4, T1, T2>(parsers: [
    [Parser<M, S, E1, {}>, Parser<M, S, E2, T1>],
    [Parser<M, S, E3, {}>, Parser<M, S, E4, T2>]
]): Parser<M, S, E1 | E2 | E3 | E4, T1 | T2>;

function parseChoice<M, S extends ParserStream<M>, E1, E2, E3, E4, E5, E6, T1, T2, T3>(parsers: [
    [Parser<M, S, E1, {}>, Parser<M, S, E2, T1>],
    [Parser<M, S, E3, {}>, Parser<M, S, E4, T2>],
    [Parser<M, S, E5, {}>, Parser<M, S, E6, T3>]
]): Parser<M, S, E1 | E2 | E3 | E4 | E5 | E6, T1 | T2 | T3>;

function parseChoice<M, S extends ParserStream<M>, E1, E2, E3, E4, E5, E6, E7, E8, T1, T2, T3, T4>(parsers: [
    [Parser<M, S, E1, {}>, Parser<M, S, E2, T1>],
    [Parser<M, S, E3, {}>, Parser<M, S, E4, T2>],
    [Parser<M, S, E5, {}>, Parser<M, S, E6, T3>],
    [Parser<M, S, E7, {}>, Parser<M, S, E8, T4>]
]): Parser<M, S, E1 | E2 | E3 | E4 | E5 | E6 | E7 | E8, T1 | T2 | T3 | T4>;

function parseChoice<M, S extends ParserStream<M>, E1, E2, T>(parsers: [Parser<M, S, E1, {}>, Parser<M, S, E2, T>][]): Parser<M, S, E1 | E2, T>;

function parseChoice<M, S extends ParserStream<M>, E1, E2, T>(parsers: [Parser<M, S, E1, {}>, Parser<M, S, E2, T>][]): Parser<M, S, E1 | E2, T> {
    if (!parsers.length) {
        throw new Error('No parsers provided');
    }

    return (st) => {
        let ret;
        for (const pair of parsers) {
            const res = pair[0](st);

            if (res.kind === 'right') {
                return pair[1](res.value[1]);
            }

            ret = res;
        }

        return ret!;
    };
}
