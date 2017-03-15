
export {
    /* Types */
    Parser, ParserStream, EosReached, EosExpected,

    /* combinators */
    map, mapError,

    many, oneOrMore, separated, pwhile,

    peek, maybe, trai, satisfy,

    any, eos, not, terminated, pconst, pfail,

    alt, alt3, alt4, genericAlt,

    choice, choice3, choice4, genericChoice,

    combine, combine3, combine4, genericCombine,

    /* monadic binds */
    recover, inspect,

    /* Auxiliary types */
    Left, Right, Either, Literal, Any,

    /* helpers */
    left, right, pair
}

type Any = {} | undefined | null

type Left<L>  = { kind: 'left',  value: L }
type Right<R> = { kind: 'right', value: R }

type Either<L, R> = Left<L> | Right<R>

type Literal = boolean | string | number | null | undefined | object;

interface ParserStream<S> {
    next(this: this): [S, this]|null;
}

type Parser<M, S extends ParserStream<M>, E, T> = (st: S) => Either<E, [T, S]>

type EosReached  = { kind: 'pc_error', code: 'eos_reached'  }
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

const eosReached = left({ kind: 'pc_error', code: 'eos_reached' } as EosReached);

function any<M, S extends ParserStream<M>>(st: S): Either<EosReached, [M, S]> {
    const val = st.next();

    if (!val) {
        return eosReached;
    }

    return right(val);
}

const eosExpected = left({ kind: 'pc_error', code: 'eos_expected' } as EosExpected);

function eos<S extends ParserStream<Any>>(st: S): Either<EosExpected, [undefined, S]> {
    if (st.next()) {
        return eosExpected;
    }

    return right(pair(undefined, st));
}

function terminated<M, S extends ParserStream<M>, E, T>(p: Parser<M, S, E, T>) {
    return combine(p, eos, x => x);
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

function not<M, S extends ParserStream<M>, E, T>(p: Parser<M, S, E, T>): Parser<M, S, T, E> {
    return (st) => {
        const res = p(st);

        if (res.kind === 'left') {
            return right(pair(res.value, st));
        }

        return left(res.value[0]);
    };
}

function alt<M, S extends ParserStream<M>, E, A, B>(
    p1: Parser<M, S, Any, A>,
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

function alt3<M, S extends ParserStream<M>, E, A, B, C>(
    p1: Parser<M, S, Any, A>,
    p2: Parser<M, S, Any, B>,
    p3: Parser<M, S, E, C>
): Parser<M, S, E, A|B|C> {
    return genericAlt<M, S, any, A|B|C>([ p1, p2, p3 ]);
}

function alt4<M, S extends ParserStream<M>, E, A, B, C, D>(
    p1: Parser<M, S, Any, A>,
    p2: Parser<M, S, Any, B>,
    p3: Parser<M, S, Any, C>,
    p4: Parser<M, S, E,  D>
): Parser<M, S, E, A|B|C|D> {
    return genericAlt<M, S, any, A|B|C|D>([ p1, p2, p3, p4 ]);
}

function genericAlt<M, S extends ParserStream<M>, E, T>(parsers: Parser<M, S, E, T>[]): Parser<M, S, E, T> {
    if (!parsers.length) {
        throw new Error('No parsers provided');
    }
    if (!parsers.every(x => typeof x === 'function')) {
        throw new Error('Empty parser!');
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

function combine<M, S extends ParserStream<M>, E1, E2, A, B, C>(
    p1: Parser<M, S, E1, A>,
    p2: Parser<M, S, E2, B>,
    f: (a: A, b: B) => C
): Parser<M, S, E1|E2, C> {
    return genericCombine<M, S, E1|E2, A|B, C>([ p1, p2 ], f);
}

function combine3<M, S extends ParserStream<M>, E1, E2, E3, A, B, C, D>(
    p1: Parser<M, S, E1, A>,
    p2: Parser<M, S, E2, B>,
    p3: Parser<M, S, E3, C>,
    f: (a: A, b: B, c: C) => D
): Parser<M, S, E1|E2|E3, D> {
    return genericCombine<M, S, E1|E2|E3, A|B|C, D>([ p1, p2, p3 ], f);
}

function combine4<M, S extends ParserStream<M>, E1, E2, E3, E4, A, B, C, D, F>(
    p1: Parser<M, S, E1, A>,
    p2: Parser<M, S, E2, B>,
    p3: Parser<M, S, E3, C>,
    p4: Parser<M, S, E4, D>,
    f: (a: A, b: B, c: C, d: D) => F
): Parser<M, S, E1|E2|E3|E4, F> {
    return genericCombine<M, S, E1|E2|E3|E4, A|B|C|D, F>([ p1, p2, p3, p4 ], f);
}

function genericCombine<M, S extends ParserStream<M>, E, A, B>(
    parsers: Parser<M, S, E, A>[],
    f: (...values: A[]) => B
): Parser<M, S, E, B> {
    if (!parsers.length) {
        throw new Error('No parsers provided');
    }
    if (!parsers.every(x => typeof x === 'function')) {
        throw new Error('Empty parser!');
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

function many<M, S extends ParserStream<M>, A>(p: Parser<M, S, Any, A>): Parser<M, S, never, A[]> {
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

function pwhile<M, S extends ParserStream<M>, E, T>(
    cond: Parser<M, S, Any, Any>,
    body: Parser<M, S, E, T>
): Parser<M, S, E, T[]> {
    return (st) => {
        let cur = st;
        const results: T[] = [];

        while (true) {
            const temp = cond(cur);

            if (temp.kind !== 'right') {
                break;
            }

            const res = body(temp.value[1]);
            if (res.kind === 'left') {
                return res;
            }

            cur = res.value[1];
            results.push(res.value[0])
        }

        return right(pair(results, cur));
    };
}

function oneOrMore<M, S extends ParserStream<M>, E, A>(p: Parser<M, S, E, A>): Parser<M, S, E, A[]> {
    return combine(p, many(p), (x, xs) => (xs.unshift(x), xs));
}

function separated<M, S extends ParserStream<M>, Е, T>(
    p: Parser<M, S, Е, T>,
    sep: Parser<M, S, Any, Any>
): Parser<M, S, Е, T[]> {
    return combine(p, many(combine(sep, p, (_, x) => x)), (x, xs) => (xs.unshift(x), xs));
}

function peek<M, S extends ParserStream<M>, E>(p1: Parser<M, S, E, Any>): Parser<M, S, E, true> {
    return (st) => {
        const res = p1(st);

        if (res.kind === 'left') {
            return res;
        }

        return right(pair(true, st));
    };
}

function maybe<M, S extends ParserStream<M>, A>(p1: Parser<M, S, Any, A>): Parser<M, S, never, A|undefined> {
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

function choice<M, S extends ParserStream<M>, E1, E2, E3, T1, T2>(
    p1: [Parser<M, S, Any, Any>, Parser<M, S, E2, T1>],
    p2: [Parser<M, S, E1,  Any>, Parser<M, S, E3, T2>]
): Parser<M, S, E1|E2|E3, T1|T2> {
    return genericChoice<M, S, any, E2|E3, T1|T2>([p1, p2]);
}

function choice3<M, S extends ParserStream<M>, E1, E2, E3, E4, T1, T2, T3>(
    p1: [Parser<M, S, Any, Any>, Parser<M, S, E2, T1>],
    p2: [Parser<M, S, Any, Any>, Parser<M, S, E3, T2>],
    p3: [Parser<M, S, E1,  Any>, Parser<M, S, E4, T3>]
): Parser<M, S, E1|E2|E3|E4, T1|T2|T3> {
    return genericChoice<M, S, any, E2|E3|E4, T1|T2|T3>([p1, p2, p3]);
}

function choice4<M, S extends ParserStream<M>, E1, E2, E3, E4, E5, T1, T2, T3, T4>(
    p1: [Parser<M, S, Any, Any>, Parser<M, S, E2, T1>],
    p2: [Parser<M, S, Any, Any>, Parser<M, S, E3, T2>],
    p3: [Parser<M, S, Any, Any>, Parser<M, S, E4, T3>],
    p4: [Parser<M, S, E1,  Any>, Parser<M, S, E5, T4>]
): Parser<M, S, E1|E2|E3|E4|E5, T1|T2|T3|T4> {
    return genericChoice<M, S, any, E2|E3|E4|E5, T1|T2|T3|T4>([p1, p2, p3, p4]);
}

function genericChoice<M, S extends ParserStream<M>, E1, E2, T>(
    parsers: [Parser<M, S, E1, Any>, Parser<M, S, E2, T>][]
): Parser<M, S, E1|E2, T> {
    if (!parsers.length) {
        throw new Error('No parsers provided');
    }
    if (!parsers.every(x => typeof x[0] === 'function' && typeof x[1] === 'function')) {
        throw new Error('Empty parser!');
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
