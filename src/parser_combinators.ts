
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

type Parser<M, E, T, S extends ParserStream<M>> = (st: S) => Either<E, [T, S]>

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

function parseMap<M, E, A, B, S extends ParserStream<M>>(p: Parser<M, E, A, S>, f: (a: A) => B): Parser<M, E, B, S> {
    return (st) => {
        const res = p(st);
        if (res.kind === 'left') {
            return res;
        }

        return right(pair(f(res.value[0]), res.value[1]));
    };
}

function parseMapError<M, E1, E2, T, S extends ParserStream<M>>(p: Parser<M, E1, T, S>, f: (e: E1) => E2): Parser<M, E2, T, S> {
    return (st) => {
        const res = p(st);
        if (res.kind === 'left') {
            return left(f(res.value));
        }

        return res;
    };
}

const eosExpected = left({ kind: 'pc_error', code: 'eos_expected' } as EosExpected);

export const parseEos: Parser<never, EosExpected, void, ParserStream<never>> = (st) => {
    if (st.next()) {
        return eosExpected;
    }

    return right(pair(undefined, st));
};

function parseConst<T>(x: T): Parser<never, never, T, never> {
    return (st) => {
        return right(pair(x, st));
    };
}

function parseFail<E>(e: E): Parser<never, E, never, never> {
    const error = left(e);
    return (_) => {
        return error;
    };
}

function parseAlt<M, E, A, B, S extends ParserStream<M>>(
    p1: Parser<M, {}, A, S>,
    p2: Parser<M, E, B, S>
): Parser<M, E, A|B, S> {
    return (st) => {
        const r1 = p1(st);
        if (r1.kind !== 'left') {
            return r1;
        }

        return p2(st);
    };
}

function parseAlt3<M, E, A, B, C, S extends ParserStream<M>>(
    p1: Parser<M, {}, A, S>,
    p2: Parser<M, {}, B, S>,
    p3: Parser<M, E, C, S>
): Parser<M, E, A|B|C, S> {
    return parseAltUnsafe([ p1, p2, p3 ]);
}

function parseAltUnsafe<M, S extends ParserStream<M>>(parsers: Parser<M, any, any, S>[]): Parser<M, any, any, S> {
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

function parseCombine<M, E1, E2, A, B, C, S extends ParserStream<M>>(
    p1: Parser<M, E1, A, S>,
    p2: Parser<M, E2, B, S>,
    f: (a: A, b: B) => C
): Parser<M, E1 | E2, C, S> {
    return parseCombineUnsafe([ p1, p2 ], f);
}

function parseCombine3<M, E1, E2, E3, A, B, C, D, S extends ParserStream<M>>(
    p1: Parser<M, E1, A, S>,
    p2: Parser<M, E2, B, S>,
    p3: Parser<M, E3, C, S>,
    f: (a: A, b: B, c: C) => D
): Parser<M, E1 | E2 | E3, D, S> {
    return parseCombineUnsafe([ p1, p2, p3 ], f);
}

function parseCombine4<M, E1, E2, E3, E4, A, B, C, D, F, S extends ParserStream<M>>(
    p1: Parser<M, E1, A, S>,
    p2: Parser<M, E2, B, S>,
    p3: Parser<M, E3, C, S>,
    p4: Parser<M, E4, D, S>,
    f: (a: A, b: B, c: C, d: D) => F
): Parser<M, E1 | E2 | E3 | E4, F, S> {
    return parseCombineUnsafe([ p1, p2, p3, p4 ], f);
}

function parseCombineUnsafe<M, S extends ParserStream<M>>(parsers: Parser<M, any, any, S>[], f: (...values: any[]) => any): Parser<M, any, any, S> {
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

function parseMany<M, E, A, S extends ParserStream<M>>(p: Parser<M, E, A, S>): Parser<M, never, A[], S> {
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

function parseMaybe<M, A, S extends ParserStream<M>>(p1: Parser<M, {}, A, S>): Parser<M, never, A|undefined, S> {
    return (st) => {
        const res = p1(st);

        if (res.kind === 'left') {
            return right(pair(undefined, st));
        }

        return res;
    };
}

function parseTry<M, E1, E2, A, B, C, S extends ParserStream<M>>(
    p1: Parser<M, E1, A, S>,
    p2: Parser<M, E2, B, S>,
    f: (a: A, b: B) => C
): Parser<M, E2, C|undefined, S> {
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

function parseRecover<M, E1, E2, A, B, S extends ParserStream<M>>(
    p1: Parser<M, E1, A, S>,
    f: (e: E1) => Parser<M, E2, B, S>
): Parser<M, E2, A | B, S> {
    return (st) => {
        const res = p1(st);
        if (res.kind === 'right') {
            return res;
        }

        return f(res.value)(st);
    };
}

function parseInspect<M, E1, E2, A, B, S extends ParserStream<M>>(
    p1: Parser<M, E1, A, S>,
    f: (e: A) => Parser<M, E2, B, S>
): Parser<M, E1 | E2, B, S> {
    return (st) => {
        const res = p1(st);
        if (res.kind === 'left') {
            return res;
        }

        return f(res.value[0])(st);
    };
}

function parseSatisfy<M, E, S extends ParserStream<M>>(f: (x: M) => boolean, e: E): Parser<M, E, M, S> {
    const error = left(e);
    return (st) => {
        const res = st.next();
        if (!res || !f(res[0])) {
            return error;
        }

        return right(res);
    };
}

function parseChoice<M, E1, E2, E3, E4, T1, T2, S extends ParserStream<M>>(parsers: [
    [Parser<M, E1, {}, S>, Parser<M, E2, T1, S>],
    [Parser<M, E3, {}, S>, Parser<M, E4, T2, S>]
]): Parser<M, E1 | E2 | E3 | E4, T1 | T2, S>;

function parseChoice<M, E1, E2, E3, E4, E5, E6, T1, T2, T3, S extends ParserStream<M>>(parsers: [
    [Parser<M, E1, {}, S>, Parser<M, E2, T1, S>],
    [Parser<M, E3, {}, S>, Parser<M, E4, T2, S>],
    [Parser<M, E5, {}, S>, Parser<M, E6, T3, S>]
]): Parser<M, E1 | E2 | E3, T1 | T2 | T3, S>;

function parseChoice<M, E1, E2, E3, E4, E5, E6, E7, E8, T1, T2, T3, T4, S extends ParserStream<M>>(parsers: [
    [Parser<M, E1, {}, S>, Parser<M, E2, T1, S>],
    [Parser<M, E3, {}, S>, Parser<M, E4, T2, S>],
    [Parser<M, E5, {}, S>, Parser<M, E6, T3, S>],
    [Parser<M, E7, {}, S>, Parser<M, E8, T4, S>]
]): Parser<M, E1 | E2 | E3 | E4, T1 | T2 | T3 | T4, S>;

function parseChoice<M, E1, E2, T, S extends ParserStream<M>>(parsers: [Parser<M, E1, {}, S>, Parser<M, E2, T, S>][]): Parser<M, E1 | E2, T, S>;

function parseChoice<M, E1, E2, T, S extends ParserStream<M>>(parsers: [Parser<M, E1, {}, S>, Parser<M, E2, T, S>][]): Parser<M, E1 | E2, T, S> {
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
