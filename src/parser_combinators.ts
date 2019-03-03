
export {
    /* Types */
    Parser, ParserStream, EosReached, EosExpected,

    /* combinators */
    map, mapError,

    many, oneOrMore, pwhile,

    separated, separatedZero, separatedTrailing, separatedZeroTrailing,

    peek, maybe, trai, satisfy,

    any, eos, not, terminated, pconst, pfail, forward,

    getData, setData, modifyData, withFilter,

    /* monadic binds */
    recover, inspect,

    /* Auxiliary types */
    Left, Right, Either, Literal,

    /* helpers */
    left, right, pair,
    _1, _2, _3, _4, tagged
}

import { combine } from './generated_combinators'
export * from './generated_combinators'

interface Left<L>  { kind: 'left',  value: L }
interface Right<R> { kind: 'right', value: R }

type Either<L, R> = Left<L> | Right<R>

type Literal = boolean | string | number | null | undefined | {};

interface ParserStream<S> {
    getData(): any;
    setData(data: any): this;

    next(this: this): [S, this]|null;
}

interface Parser<M, S extends ParserStream<M>, E, T> {
    (st: S): Either<E, [T, S]>
}

interface EosReached  { kind: 'pc_error', code: 'eos_reached'  }
interface EosExpected { kind: 'pc_error', code: 'eos_expected' }

function left<L>(value: L): Left<L> {
    return { kind: 'left', value };
}

function right<R>(value: R): Right<R> {
    return { kind: 'right', value };
}

function pair<F extends Literal, S>(fst: F, snd: S): [F, S] {
    return [fst, snd];
}

function _1<T>(x: T) {
    return x;
}

function _2<T>(_: any, x: T) {
    return x;
}

function _3<T>(_1: any, _2: any, x: T) {
    return x;
}

function _4<T>(_1: any, _2: any, _3: any, x: T) {
    return x;
}

function tagged<T extends string, V>(tag: T, value: V) {
    return { tag, value };
}

function mkFilterStream<S extends ParserStream<any>, T>(filter: (x: T) => T, st: S): S {
    const wrapped: S = Object.create(st);
    wrapped.next = () => {
        const val = st.next();
        if (!val) {
            return val;
        }
        return [filter(val[0]), mkFilterStream(filter, val[1])];
    };

    return wrapped;
}

function unwrapFilterStream<S extends ParserStream<any>>(st: S): S {
    const wrapped: S = Object.getPrototypeOf(st);
    if (!(wrapped.next as any)) {
        throw new Error('Assert: Unwrapping failed');
    }

    return wrapped;
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

function withFilter<M, S extends ParserStream<M>, E, T>(
    filter: (x: M) => M,
    p: Parser<M, S, E, T>
): Parser<M, S, E, T> {
    return st => {
        const res = p(mkFilterStream(filter, st));
        if (res.kind === 'left') {
            return res;
        }

        return right(pair(res.value[0], unwrapFilterStream(res.value[1])));
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

function eos<S extends ParserStream<unknown>>(st: S): Either<EosExpected, [undefined, S]> {
    if (st.next()) {
        return eosExpected;
    }

    return right(pair(undefined, st));
}

function terminated<M, S extends ParserStream<M>, E, T>(p: Parser<M, S, E, T>) {
    return combine(p, eos, x => x);
}

function forward<M, S extends ParserStream<M>, E, T>(f: () => Parser<M, S, E, T>): Parser<M, S, E, T> {
    return (st) => f()(st);
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

function many<M, S extends ParserStream<M>, A>(p: Parser<M, S, unknown, A>): Parser<M, S, never, A[]> {
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
    cond: Parser<M, S, unknown, unknown>,
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
    sep: Parser<M, S, unknown, unknown>
): Parser<M, S, E, T[]> {
    return combine(p, pwhile(sep, p), (x, xs) => (xs.unshift(x), xs));
}

function separatedZero<M, S extends ParserStream<M>, E, T>(
    p: Parser<M, S, E, T>,
    sep: Parser<M, S, unknown, unknown>
): Parser<M, S, E, T[]> {
    return map(
        trai(p, pwhile(sep, p), (x, xs) => (xs.unshift(x), xs)),
        res => res || []
    );
}

function separatedTrailing<M, S extends ParserStream<M>, E, T>(
    p: Parser<M, S, E, T>,
    sep: Parser<M, S, unknown, unknown>
): Parser<M, S, E, T[]> {
    return combine(
        p,
        trai(
            sep,
            separatedZeroTrailing(p, sep),
            _2
        ),

        (x, xs) => xs ? (xs.unshift(x), xs) : [x]
    );
}

function separatedZeroTrailing<M, S extends ParserStream<M>, E, T>(
    p: Parser<M, S, E, T>,
    sep: Parser<M, S, unknown, unknown>
): Parser<M, S, E, T[]> {
    return combine(
        many(combine(p, sep, _1)),
        maybe(p),
        (xs, x) => (x && xs.push(x), xs)
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

function maybe<M, S extends ParserStream<M>, A>(p1: Parser<M, S, unknown, A>): Parser<M, S, never, A|undefined> {
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
