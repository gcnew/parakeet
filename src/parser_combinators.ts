
export {
    /* Types */
    Parser, ParserStream, EosReached, EosExpected,

    /* combinators */
    map, mapError,

    many, oneOrMore, separated, separatedZero, pwhile,

    peek, maybe, trai, satisfy,

    any, eos, not, terminated, pconst, pfail,

    genericAlt, genericChoice, genericCombine,

    getData, setData, modifyData,

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
    getData(): any;
    setData(data: any): this;

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

const eosReached = left<EosReached>({ kind: 'pc_error', code: 'eos_reached' });

function any<M, S extends ParserStream<M>>(st: S): Either<EosReached, [M, S]> {
    const val = st.next();

    if (!val) {
        return eosReached;
    }

    return right(val);
}

const eosExpected = left<EosExpected>({ kind: 'pc_error', code: 'eos_expected' });

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

function getData<S extends ParserStream<any>>(st: S): Either<never, [any, S]> {
    return right(pair(st.getData(), st));
}

function setData(data: any) {
    return <S extends { setData(data: any): any; }>(st: S): Either<never, [undefined, S]> => {
        return right(pair(undefined, st.setData(data)));
    };
}

function modifyData(f: (data: any) => any) {
    return <S extends { setData(data: any): any; getData(): any; }>(st: S): Either<never, [any, S]> => {
        const newData = f(st.getData());
        return right(pair(newData, st.setData(newData)));
    };
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

function separated<M, S extends ParserStream<M>, E, T>(
    p: Parser<M, S, E, T>,
    sep: Parser<M, S, Any, Any>
): Parser<M, S, E, T[]> {
    return combine(p, pwhile(sep, p), (x, xs) => (xs.unshift(x), xs));
}

function separatedZero<M, S extends ParserStream<M>, E, T>(
    p: Parser<M, S, E, T>,
    sep: Parser<M, S, Any, Any>
): Parser<M, S, E, T[]> {
    return map(
        trai(p, pwhile(sep, p), (x, xs) => (xs.unshift(x), xs)),
        res => res || []
    );
}

function peek<M, S extends ParserStream<M>, E, T>(p1: Parser<M, S, E, T>): Parser<M, S, E, T> {
    return (st) => {
        const res = p1(st);

        if (res.kind === 'left') {
            return res;
        }

        return right(pair(res.value[0], st));
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

        return f(res.value[0])(res.value[1]);
    };
}

function satisfy<M, S extends ParserStream<M>, E>(f: (x: M) => boolean, e: E): Parser<M, S, EosReached|E, M> {
    const error = left(e);
    return (st) => {
        const res = st.next();
        if (!res) {
            return eosReached;
        }

        if (!f(res[0])) {
            return error;
        }

        return right(res);
    };
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


/* ======= GENERATED ======== */

export function alt<M, S extends ParserStream<M>, E, T1, T2>(
    p1: Parser<M, S, Any, T1>,
    p2: Parser<M, S, E, T2>
): Parser<M, S, E, T1|T2> {
    return genericAlt<M, S, any, T1|T2>([p1, p2]);
}

export function alt3<M, S extends ParserStream<M>, E, T1, T2, T3>(
    p1: Parser<M, S, Any, T1>,
    p2: Parser<M, S, Any, T2>,
    p3: Parser<M, S, E, T3>
): Parser<M, S, E, T1|T2|T3> {
    return genericAlt<M, S, any, T1|T2|T3>([p1, p2, p3]);
}

export function alt4<M, S extends ParserStream<M>, E, T1, T2, T3, T4>(
    p1: Parser<M, S, Any, T1>,
    p2: Parser<M, S, Any, T2>,
    p3: Parser<M, S, Any, T3>,
    p4: Parser<M, S, E, T4>
): Parser<M, S, E, T1|T2|T3|T4> {
    return genericAlt<M, S, any, T1|T2|T3|T4>([p1, p2, p3, p4]);
}

export function alt5<M, S extends ParserStream<M>, E, T1, T2, T3, T4, T5>(
    p1: Parser<M, S, Any, T1>,
    p2: Parser<M, S, Any, T2>,
    p3: Parser<M, S, Any, T3>,
    p4: Parser<M, S, Any, T4>,
    p5: Parser<M, S, E, T5>
): Parser<M, S, E, T1|T2|T3|T4|T5> {
    return genericAlt<M, S, any, T1|T2|T3|T4|T5>([p1, p2, p3, p4, p5]);
}

export function alt6<M, S extends ParserStream<M>, E, T1, T2, T3, T4, T5, T6>(
    p1: Parser<M, S, Any, T1>,
    p2: Parser<M, S, Any, T2>,
    p3: Parser<M, S, Any, T3>,
    p4: Parser<M, S, Any, T4>,
    p5: Parser<M, S, Any, T5>,
    p6: Parser<M, S, E, T6>
): Parser<M, S, E, T1|T2|T3|T4|T5|T6> {
    return genericAlt<M, S, any, T1|T2|T3|T4|T5|T6>([p1, p2, p3, p4, p5, p6]);
}

export function alt7<M, S extends ParserStream<M>, E, T1, T2, T3, T4, T5, T6, T7>(
    p1: Parser<M, S, Any, T1>,
    p2: Parser<M, S, Any, T2>,
    p3: Parser<M, S, Any, T3>,
    p4: Parser<M, S, Any, T4>,
    p5: Parser<M, S, Any, T5>,
    p6: Parser<M, S, Any, T6>,
    p7: Parser<M, S, E, T7>
): Parser<M, S, E, T1|T2|T3|T4|T5|T6|T7> {
    return genericAlt<M, S, any, T1|T2|T3|T4|T5|T6|T7>([p1, p2, p3, p4, p5, p6, p7]);
}

export function alt8<M, S extends ParserStream<M>, E, T1, T2, T3, T4, T5, T6, T7, T8>(
    p1: Parser<M, S, Any, T1>,
    p2: Parser<M, S, Any, T2>,
    p3: Parser<M, S, Any, T3>,
    p4: Parser<M, S, Any, T4>,
    p5: Parser<M, S, Any, T5>,
    p6: Parser<M, S, Any, T6>,
    p7: Parser<M, S, Any, T7>,
    p8: Parser<M, S, E, T8>
): Parser<M, S, E, T1|T2|T3|T4|T5|T6|T7|T8> {
    return genericAlt<M, S, any, T1|T2|T3|T4|T5|T6|T7|T8>([p1, p2, p3, p4, p5, p6, p7, p8]);
}

export function combine<M, S extends ParserStream<M>, E1, E2, T1, T2, T3>(
    p1: Parser<M, S, E1, T1>,
    p2: Parser<M, S, E2, T2>,
    f: (a1: T1, a2: T2) => T3
): Parser<M, S, E1|E2, T3> {
    return genericCombine<M, S, E1|E2, T1|T2, T3>([p1, p2], f);
}

export function combine3<M, S extends ParserStream<M>, E1, E2, E3, T1, T2, T3, T4>(
    p1: Parser<M, S, E1, T1>,
    p2: Parser<M, S, E2, T2>,
    p3: Parser<M, S, E3, T3>,
    f: (a1: T1, a2: T2, a3: T3) => T4
): Parser<M, S, E1|E2|E3, T4> {
    return genericCombine<M, S, E1|E2|E3, T1|T2|T3, T4>([p1, p2, p3], f);
}

export function combine4<M, S extends ParserStream<M>, E1, E2, E3, E4, T1, T2, T3, T4, T5>(
    p1: Parser<M, S, E1, T1>,
    p2: Parser<M, S, E2, T2>,
    p3: Parser<M, S, E3, T3>,
    p4: Parser<M, S, E4, T4>,
    f: (a1: T1, a2: T2, a3: T3, a4: T4) => T5
): Parser<M, S, E1|E2|E3|E4, T5> {
    return genericCombine<M, S, E1|E2|E3|E4, T1|T2|T3|T4, T5>([p1, p2, p3, p4], f);
}

export function combine5<M, S extends ParserStream<M>, E1, E2, E3, E4, E5, T1, T2, T3, T4, T5, T6>(
    p1: Parser<M, S, E1, T1>,
    p2: Parser<M, S, E2, T2>,
    p3: Parser<M, S, E3, T3>,
    p4: Parser<M, S, E4, T4>,
    p5: Parser<M, S, E5, T5>,
    f: (a1: T1, a2: T2, a3: T3, a4: T4, a5: T5) => T6
): Parser<M, S, E1|E2|E3|E4|E5, T6> {
    return genericCombine<M, S, E1|E2|E3|E4|E5, T1|T2|T3|T4|T5, T6>([p1, p2, p3, p4, p5], f);
}

export function combine6<M, S extends ParserStream<M>, E1, E2, E3, E4, E5, E6, T1, T2, T3, T4, T5, T6, T7>(
    p1: Parser<M, S, E1, T1>,
    p2: Parser<M, S, E2, T2>,
    p3: Parser<M, S, E3, T3>,
    p4: Parser<M, S, E4, T4>,
    p5: Parser<M, S, E5, T5>,
    p6: Parser<M, S, E6, T6>,
    f: (a1: T1, a2: T2, a3: T3, a4: T4, a5: T5, a6: T6) => T7
): Parser<M, S, E1|E2|E3|E4|E5|E6, T7> {
    return genericCombine<M, S, E1|E2|E3|E4|E5|E6, T1|T2|T3|T4|T5|T6, T7>([p1, p2, p3, p4, p5, p6], f);
}

export function combine7<M, S extends ParserStream<M>, E1, E2, E3, E4, E5, E6, E7, T1, T2, T3, T4, T5, T6, T7, T8>(
    p1: Parser<M, S, E1, T1>,
    p2: Parser<M, S, E2, T2>,
    p3: Parser<M, S, E3, T3>,
    p4: Parser<M, S, E4, T4>,
    p5: Parser<M, S, E5, T5>,
    p6: Parser<M, S, E6, T6>,
    p7: Parser<M, S, E7, T7>,
    f: (a1: T1, a2: T2, a3: T3, a4: T4, a5: T5, a6: T6, a7: T7) => T8
): Parser<M, S, E1|E2|E3|E4|E5|E6|E7, T8> {
    return genericCombine<M, S, E1|E2|E3|E4|E5|E6|E7, T1|T2|T3|T4|T5|T6|T7, T8>([p1, p2, p3, p4, p5, p6, p7], f);
}

export function combine8<M, S extends ParserStream<M>, E1, E2, E3, E4, E5, E6, E7, E8, T1, T2, T3, T4, T5, T6, T7, T8, T9>(
    p1: Parser<M, S, E1, T1>,
    p2: Parser<M, S, E2, T2>,
    p3: Parser<M, S, E3, T3>,
    p4: Parser<M, S, E4, T4>,
    p5: Parser<M, S, E5, T5>,
    p6: Parser<M, S, E6, T6>,
    p7: Parser<M, S, E7, T7>,
    p8: Parser<M, S, E8, T8>,
    f: (a1: T1, a2: T2, a3: T3, a4: T4, a5: T5, a6: T6, a7: T7, a8: T8) => T9
): Parser<M, S, E1|E2|E3|E4|E5|E6|E7|E8, T9> {
    return genericCombine<M, S, E1|E2|E3|E4|E5|E6|E7|E8, T1|T2|T3|T4|T5|T6|T7|T8, T9>([p1, p2, p3, p4, p5, p6, p7, p8], f);
}

export function choice<M, S extends ParserStream<M>, E1, E2, E3, T1, T2>(
    p1: [Parser<M, S, Any, Any>, Parser<M, S, E1, T1>],
    p2: [Parser<M, S, E3, Any>, Parser<M, S, E2, T2>]
): Parser<M, S, E1|E2|E3, T1|T2> {
    return genericChoice<M, S, any, E1|E2, T1|T2>([p1, p2]);
}

export function choice3<M, S extends ParserStream<M>, E1, E2, E3, E4, T1, T2, T3>(
    p1: [Parser<M, S, Any, Any>, Parser<M, S, E1, T1>],
    p2: [Parser<M, S, Any, Any>, Parser<M, S, E2, T2>],
    p3: [Parser<M, S, E4, Any>, Parser<M, S, E3, T3>]
): Parser<M, S, E1|E2|E3|E4, T1|T2|T3> {
    return genericChoice<M, S, any, E1|E2|E3, T1|T2|T3>([p1, p2, p3]);
}

export function choice4<M, S extends ParserStream<M>, E1, E2, E3, E4, E5, T1, T2, T3, T4>(
    p1: [Parser<M, S, Any, Any>, Parser<M, S, E1, T1>],
    p2: [Parser<M, S, Any, Any>, Parser<M, S, E2, T2>],
    p3: [Parser<M, S, Any, Any>, Parser<M, S, E3, T3>],
    p4: [Parser<M, S, E5, Any>, Parser<M, S, E4, T4>]
): Parser<M, S, E1|E2|E3|E4|E5, T1|T2|T3|T4> {
    return genericChoice<M, S, any, E1|E2|E3|E4, T1|T2|T3|T4>([p1, p2, p3, p4]);
}

export function choice5<M, S extends ParserStream<M>, E1, E2, E3, E4, E5, E6, T1, T2, T3, T4, T5>(
    p1: [Parser<M, S, Any, Any>, Parser<M, S, E1, T1>],
    p2: [Parser<M, S, Any, Any>, Parser<M, S, E2, T2>],
    p3: [Parser<M, S, Any, Any>, Parser<M, S, E3, T3>],
    p4: [Parser<M, S, Any, Any>, Parser<M, S, E4, T4>],
    p5: [Parser<M, S, E6, Any>, Parser<M, S, E5, T5>]
): Parser<M, S, E1|E2|E3|E4|E5|E6, T1|T2|T3|T4|T5> {
    return genericChoice<M, S, any, E1|E2|E3|E4|E5, T1|T2|T3|T4|T5>([p1, p2, p3, p4, p5]);
}

export function choice6<M, S extends ParserStream<M>, E1, E2, E3, E4, E5, E6, E7, T1, T2, T3, T4, T5, T6>(
    p1: [Parser<M, S, Any, Any>, Parser<M, S, E1, T1>],
    p2: [Parser<M, S, Any, Any>, Parser<M, S, E2, T2>],
    p3: [Parser<M, S, Any, Any>, Parser<M, S, E3, T3>],
    p4: [Parser<M, S, Any, Any>, Parser<M, S, E4, T4>],
    p5: [Parser<M, S, Any, Any>, Parser<M, S, E5, T5>],
    p6: [Parser<M, S, E7, Any>, Parser<M, S, E6, T6>]
): Parser<M, S, E1|E2|E3|E4|E5|E6|E7, T1|T2|T3|T4|T5|T6> {
    return genericChoice<M, S, any, E1|E2|E3|E4|E5|E6, T1|T2|T3|T4|T5|T6>([p1, p2, p3, p4, p5, p6]);
}

export function choice7<M, S extends ParserStream<M>, E1, E2, E3, E4, E5, E6, E7, E8, T1, T2, T3, T4, T5, T6, T7>(
    p1: [Parser<M, S, Any, Any>, Parser<M, S, E1, T1>],
    p2: [Parser<M, S, Any, Any>, Parser<M, S, E2, T2>],
    p3: [Parser<M, S, Any, Any>, Parser<M, S, E3, T3>],
    p4: [Parser<M, S, Any, Any>, Parser<M, S, E4, T4>],
    p5: [Parser<M, S, Any, Any>, Parser<M, S, E5, T5>],
    p6: [Parser<M, S, Any, Any>, Parser<M, S, E6, T6>],
    p7: [Parser<M, S, E8, Any>, Parser<M, S, E7, T7>]
): Parser<M, S, E1|E2|E3|E4|E5|E6|E7|E8, T1|T2|T3|T4|T5|T6|T7> {
    return genericChoice<M, S, any, E1|E2|E3|E4|E5|E6|E7, T1|T2|T3|T4|T5|T6|T7>([p1, p2, p3, p4, p5, p6, p7]);
}

export function choice8<M, S extends ParserStream<M>, E1, E2, E3, E4, E5, E6, E7, E8, E9, T1, T2, T3, T4, T5, T6, T7, T8>(
    p1: [Parser<M, S, Any, Any>, Parser<M, S, E1, T1>],
    p2: [Parser<M, S, Any, Any>, Parser<M, S, E2, T2>],
    p3: [Parser<M, S, Any, Any>, Parser<M, S, E3, T3>],
    p4: [Parser<M, S, Any, Any>, Parser<M, S, E4, T4>],
    p5: [Parser<M, S, Any, Any>, Parser<M, S, E5, T5>],
    p6: [Parser<M, S, Any, Any>, Parser<M, S, E6, T6>],
    p7: [Parser<M, S, Any, Any>, Parser<M, S, E7, T7>],
    p8: [Parser<M, S, E9, Any>, Parser<M, S, E8, T8>]
): Parser<M, S, E1|E2|E3|E4|E5|E6|E7|E8|E9, T1|T2|T3|T4|T5|T6|T7|T8> {
    return genericChoice<M, S, any, E1|E2|E3|E4|E5|E6|E7|E8, T1|T2|T3|T4|T5|T6|T7|T8>([p1, p2, p3, p4, p5, p6, p7, p8]);
}
