
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
    left, right, pair, ret
}

type Left<L>  = { kind: 'left',  value: L }
type Right<R> = { kind: 'right', value: R }

type Either<L, R> = Left<L> | Right<R>

// type List<T> = { kind: 'cons', head: T, rest: List<T> }
//              | { kind: 'nil' }

// interface ParserStream<S> {
//     next(this: this): [S, this];
// }


type ParserStream<S> = {
    next(this: ParserStream<S>): [S, ParserStream<S>]|null;
}

type Parser<S, E, T> = (st: ParserStream<S>) => Either<E, [T, ParserStream<S>]>

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

function ret<T, S>(val: T, rest: ParserStream<S>) {
    return right(pair(val, rest));
}

function parseMap<S, E, A, B>(p: Parser<S, E, A>, f: (a: A) => B): Parser<S, E, B> {
    return (st) => {
        const res = p(st);
        if (res.kind === 'left') {
            return res;
        }

        return ret(f(res.value[0]), res.value[1]);
    };
}

function parseMapError<S, E1, E2, T>(p: Parser<S, E1, T>, f: (e: E1) => E2): Parser<S, E2, T> {
    return (st) => {
        const res = p(st);
        if (res.kind === 'left') {
            return left(f(res.value));
        }

        return res;
    };
}

const eosExpected = left({ kind: 'pc_error', code: 'eos_expected' } as EosExpected);

export const parseEos: Parser<never, EosExpected, void> = (st) => {
    if (st.next()) {
        return eosExpected;
    }

    return right(pair(undefined, st));
};

function parseConst<T>(x: T): Parser<never, never, T> {
    return (st) => {
        return right(pair(x, st));
    };
}

function parseFail<E>(e: E): Parser<never, E, never> {
    const error = left(e);
    return (_) => {
        return error;
    };
}

function parseAlt<S, E, A, B>(p1: Parser<S, {}, A>, p2: Parser<S, E, B>): Parser<S, E, A|B> {
    return (st) => {
        const r1 = p1(st);
        if (r1.kind !== 'left') {
            return r1;
        }

        return p2(st);
    };
}

function parseAlt3<S, E, A, B, C>(p1: Parser<S, {}, A>, p2: Parser<S, {}, B>, p3: Parser<S, E, C>): Parser<S, E, A|B|C> {
    return parseAltUnsafe([ p1, p2, p3 ]);
}

function parseAltUnsafe<S>(parsers: Parser<S, any, any>[]): Parser<S, any, any> {
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

function parseCombine<S, E1, E2, A, B, C>(
    p1: Parser<S, E1, A>,
    p2: Parser<S, E2, B>,
    f: (a: A, b: B) => C
): Parser<S, E1 | E2, C> {
    return parseCombineUnsafe([ p1, p2 ], f);
}

function parseCombine3<S, E1, E2, E3, A, B, C, D>(
    p1: Parser<S, E1, A>,
    p2: Parser<S, E2, B>,
    p3: Parser<S, E3, C>,
    f: (a: A, b: B, c: C) => D
): Parser<S, E1 | E2 | E3, D> {
    return parseCombineUnsafe([ p1, p2, p3 ], f);
}

function parseCombine4<S, E1, E2, E3, E4, A, B, C, D, F>(
    p1: Parser<S, E1, A>,
    p2: Parser<S, E2, B>,
    p3: Parser<S, E3, C>,
    p4: Parser<S, E4, D>,
    f: (a: A, b: B, c: C, d: D) => F
): Parser<S, E1 | E2 | E3 | E4, F> {
    return parseCombineUnsafe([ p1, p2, p3, p4 ], f);
}

function parseCombineUnsafe<S>(parsers: Parser<S, any, any>[], f: (...values: any[]) => any): Parser<S, any, any> {
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

        return ret(f(...results), cur);
    };
}

function parseMany<S, E, A>(p: Parser<S, E, A>): Parser<S, never, A[]> {
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

        return ret(results, cur);
    };
}

function parseMaybe<S, A>(p1: Parser<S, {}, A>): Parser<S, never, A|undefined> {
    return (st) => {
        const res = p1(st);

        if (res.kind === 'left') {
            return right(pair(undefined, st));
        }

        return res;
    };
}

function parseTry<S, E1, E2, A, B, C>(p1: Parser<S, E1, A>, p2: Parser<S, E2, B>, f: (a: A, b: B) => C): Parser<S, E2, C|undefined> {
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

function parseRecover<S, E1, E2, A, B>(p1: Parser<S, E1, A>, f: (e: E1) => Parser<S, E2, B>): Parser<S, E2, A | B> {
    return (st) => {
        const res = p1(st);
        if (res.kind === 'right') {
            return res;
        }

        return f(res.value)(st);
    };
}

function parseInspect<S, E1, E2, A, B>(p1: Parser<S, E1, A>, f: (e: A) => Parser<S, E2, B>): Parser<S, E1 | E2, B> {
    return (st) => {
        const res = p1(st);
        if (res.kind === 'left') {
            return res;
        }

        return f(res.value[0])(st);
    };
}

function parseSatisfy<S, E>(f: (x: S) => boolean, e: E): Parser<S, E, S> {
    const error = left(e);
    return (st) => {
        const res = st.next();
        if (!res || !f(res[0])) {
            return error;
        }

        return right(res);
    };
}

function parseChoice<S, E1, E2, T>(parsers: [Parser<S, E1, {}>, Parser<S, E2, T>][]): Parser<S, E1 | E2, T> {
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
