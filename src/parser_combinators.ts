
export {
    /* Types */
    Parser, ParserStream,

    /* combinators */
    map, mapError, many, oneOrMore,

    maybe, trai, satisfy,

    eos, terminated, pconst, pfail,

    alt, choice, combine,

    /* monadic binds */
    recover, inspect,

    /* Auxiliary types */
    Left, Right, Either,

    /* helpers */
    left, right, pair
}

type Left<L>  = { kind: 'left',  value: L }
type Right<R> = { kind: 'right', value: R }

type Either<L, R> = Left<L> | Right<R>

type Literal = boolean | string | number | null | undefined | object;

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

function pair<F extends Literal, S>(fst: F, snd: S): [F, S] {
    return [fst, snd];
}

function map<M, S extends ParserStream<M>, E, A, B>(p: Parser<M, S, E, A>, f: (a: A) => B): Parser<M, S, E, B> {
    return (st) => {
        const res = p(st);
        if (res.kind === 'left') {
            return res;
        }

        return right(pair(f(res.value[0]), res.value[1]));
    };
}

function mapError<M, S extends ParserStream<M>, E1, E2, T>(p: Parser<M, S, E1, T>, f: (e: E1) => E2): Parser<M, S, E2, T> {
    return (st) => {
        const res = p(st);
        if (res.kind === 'left') {
            return left(f(res.value));
        }

        return res;
    };
}

const eosExpected = left({ kind: 'pc_error', code: 'eos_expected' } as EosExpected);

function eos<S extends ParserStream<{}>>(st: S): Either<EosExpected, [undefined, S]> {
    if (st.next()) {
        return eosExpected;
    }

    return right(pair(undefined, st));
}

function terminated<M, S extends ParserStream<M>, E, T>(p: Parser<M, S, E, T>) {
    return combine<M, S, E, EosExpected, T, undefined, T>([ p, eos ], x => x);
}

function pconst<T extends Literal>(x: T) {
    return <S>(st: S): Either<never, [T, S]> => {
        return right(pair(x, st));
    };
}

function pfail<E extends Literal>(e: E) {
    const error = left(e);
    return <S>(_: S): Either<E, never> => {
        return error;
    };
}

function alt<M, S extends ParserStream<M>, E, A, B>(parsers: [
    Parser<M, S, {}, A>,
    Parser<M, S, E, B>
]): Parser<M, S, E, A|B>;

function alt<M, S extends ParserStream<M>, E, A, B, C>(parsers: [
    Parser<M, S, {}, A>,
    Parser<M, S, {}, B>,
    Parser<M, S, E, C>
]): Parser<M, S, E, A|B|C>;

function alt<M, S extends ParserStream<M>, E, A, B, C, D>(parsers: [
    Parser<M, S, {}, A>,
    Parser<M, S, {}, B>,
    Parser<M, S, {}, C>,
    Parser<M, S, E,  D>
]): Parser<M, S, E, A|B|C|D>;

function alt<M, S extends ParserStream<M>, E, T>(parsers: Parser<M, S, E, T>[]): Parser<M, S, E, T>;

function alt<M, S extends ParserStream<M>, E, T>(parsers: Parser<M, S, E, T>[]): Parser<M, S, E, T> {
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

function combine<M, S extends ParserStream<M>, E1, E2, A, B, C>(parsers: [
        Parser<M, S, E1, A>,
        Parser<M, S, E2, B>
    ],
    f: (a: A, b: B) => C
): Parser<M, S, E1|E2, C>;

function combine<M, S extends ParserStream<M>, E1, E2, E3, A, B, C, D>(parsers: [
        Parser<M, S, E1, A>,
        Parser<M, S, E2, B>,
        Parser<M, S, E3, C>
    ],
    f: (a: A, b: B, c: C) => D
): Parser<M, S, E1|E2|E3, D>;

function combine<M, S extends ParserStream<M>, E1, E2, E3, E4, A, B, C, D, F>(parser: [
        Parser<M, S, E1, A>,
        Parser<M, S, E2, B>,
        Parser<M, S, E3, C>,
        Parser<M, S, E4, D>
    ],
    f: (a: A, b: B, c: C, d: D) => F
): Parser<M, S, E1|E2|E3|E4, F>;

function combine<M, S extends ParserStream<M>, E, A, B>(
    parsers: Parser<M, S, E, A>[],
    f: (...values: A[]) => B
): Parser<M, S, E, B>;

function combine<M, S extends ParserStream<M>, E, A, B>(
    parsers: Parser<M, S, E, A>[],
    f: (...values: A[]) => B
): Parser<M, S, E, B> {
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

function many<M, S extends ParserStream<M>, A>(p: Parser<M, S, {}, A>): Parser<M, S, never, A[]> {
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

function oneOrMore<M, S extends ParserStream<M>, E, A>(p: Parser<M, S, E, A>): Parser<M, S, E, A[]> {
    return combine([ p, many(p) ], (x, xs) => (xs.unshift(x), xs));
}

function maybe<M, S extends ParserStream<M>, A>(p1: Parser<M, S, {}, A>): Parser<M, S, never, A|undefined> {
    return (st) => {
        const res = p1(st);

        if (res.kind === 'left') {
            return right(pair(undefined, st));
        }

        return res;
    };
}

function trai<M, S extends ParserStream<M>, E1, E2, A, B, C>(
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

function recover<M, S extends ParserStream<M>, E1, E2, A, B>(
    p1: Parser<M, S, E1, A>,
    f: (e: E1) => Parser<M, S, E2, B>
): Parser<M, S, E2, A|B> {
    return (st) => {
        const res = p1(st);
        if (res.kind === 'right') {
            return res;
        }

        return f(res.value)(st);
    };
}

function inspect<M, S extends ParserStream<M>, E1, E2, A, B>(
    p1: Parser<M, S, E1, A>,
    f: (e: A) => Parser<M, S, E2, B>
): Parser<M, S, E1|E2, B> {
    return (st) => {
        const res = p1(st);
        if (res.kind === 'left') {
            return res;
        }

        return f(res.value[0])(st);
    };
}

function satisfy<M, S extends ParserStream<M>, E>(f: (x: M) => boolean, e: E): Parser<M, S, E, M> {
    const error = left(e);
    return (st) => {
        const res = st.next();
        if (!res || !f(res[0])) {
            return error;
        }

        return right(res);
    };
}

function choice<M, S extends ParserStream<M>, E1, E2, E3, E4, T1, T2>(parsers: [
    [Parser<M, S, E1, {}>, Parser<M, S, E2, T1>],
    [Parser<M, S, E3, {}>, Parser<M, S, E4, T2>]
]): Parser<M, S, E1|E2|E3|E4, T1|T2>;

function choice<M, S extends ParserStream<M>, E1, E2, E3, E4, E5, E6, T1, T2, T3>(parsers: [
    [Parser<M, S, E1, {}>, Parser<M, S, E2, T1>],
    [Parser<M, S, E3, {}>, Parser<M, S, E4, T2>],
    [Parser<M, S, E5, {}>, Parser<M, S, E6, T3>]
]): Parser<M, S, E1|E2|E3|E4|E5|E6, T1|T2|T3>;

function choice<M, S extends ParserStream<M>, E1, E2, E3, E4, E5, E6, E7, E8, T1, T2, T3, T4>(parsers: [
    [Parser<M, S, E1, {}>, Parser<M, S, E2, T1>],
    [Parser<M, S, E3, {}>, Parser<M, S, E4, T2>],
    [Parser<M, S, E5, {}>, Parser<M, S, E6, T3>],
    [Parser<M, S, E7, {}>, Parser<M, S, E8, T4>]
]): Parser<M, S, E1|E2|E3|E4|E5|E6|E7|E8, T1|T2|T3|T4>;

function choice<M, S extends ParserStream<M>, E1, E2, T>(parsers: [Parser<M, S, E1, {}>, Parser<M, S, E2, T>][]): Parser<M, S, E1|E2, T>;

function choice<M, S extends ParserStream<M>, E1, E2, T>(parsers: [Parser<M, S, E1, {}>, Parser<M, S, E2, T>][]): Parser<M, S, E1|E2, T> {
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
