export { Parser, ParserStream, EosReached, EosExpected, map, mapError, many, oneOrMore, pwhile, separated, separatedZero, separatedTrailing, separatedZeroTrailing, peek, maybe, trai, satisfy, any, eos, not, terminated, pconst, pfail, forward, getData, setData, modifyData, withFilter, recover, inspect, Left, Right, Either, Literal, left, right, pair, _1, _2, _3, _4, tagged };
export * from './generated_combinators';
interface Left<L> {
    kind: 'left';
    value: L;
}
interface Right<R> {
    kind: 'right';
    value: R;
}
declare type Either<L, R> = Left<L> | Right<R>;
declare type Literal = boolean | string | number | null | undefined | {};
interface ParserStream<S> {
    getData(): any;
    setData(data: any): this;
    next(this: this): [S, this] | null;
}
interface Parser<M, S extends ParserStream<M>, E, T> {
    (st: S): Either<E, [T, S]>;
}
interface EosReached {
    kind: 'pc_error';
    code: 'eos_reached';
}
interface EosExpected {
    kind: 'pc_error';
    code: 'eos_expected';
}
declare function left<L>(value: L): Left<L>;
declare function right<R>(value: R): Right<R>;
declare function pair<F extends Literal, S>(fst: F, snd: S): [F, S];
declare function _1<T>(x: T): T;
declare function _2<T>(_: any, x: T): T;
declare function _3<T>(_1: any, _2: any, x: T): T;
declare function _4<T>(_1: any, _2: any, _3: any, x: T): T;
declare function tagged<T extends string, V>(tag: T, value: V): {
    tag: T;
    value: V;
};
declare function map<M, S extends ParserStream<M>, E, A, B>(p: Parser<M, S, E, A>, f: (a: A) => B): Parser<M, S, E, B>;
declare function mapError<M, S extends ParserStream<M>, E1, E2, T>(p: Parser<M, S, E1, T>, f: (e: E1) => E2): Parser<M, S, E2, T>;
declare function withFilter<M, S extends ParserStream<M>, E, T>(filter: (x: M) => M, p: Parser<M, S, E, T>): Parser<M, S, E, T>;
declare function any<M, S extends ParserStream<M>>(st: S): Either<EosReached, [M, S]>;
declare function eos<S extends ParserStream<unknown>>(st: S): Either<EosExpected, [undefined, S]>;
declare function terminated<M, S extends ParserStream<M>, E, T>(p: Parser<M, S, E, T>): Parser<M, S, EosExpected | E, T>;
declare function forward<M, S extends ParserStream<M>, E, T>(f: () => Parser<M, S, E, T>): Parser<M, S, E, T>;
declare function pconst<T extends Literal>(x: T): <S>(st: S) => Either<never, [T, S]>;
declare function pfail<E extends Literal>(e: E): <S>(_: S) => Either<E, never>;
declare function not<M, S extends ParserStream<M>, E, T>(p: Parser<M, S, E, T>): Parser<M, S, T, E>;
declare function getData<S extends ParserStream<any>>(st: S): Either<never, [any, S]>;
declare function setData(data: any): <S extends {
    setData(data: any): any;
}>(st: S) => Either<never, [undefined, S]>;
declare function modifyData(f: (data: any) => any): <S extends {
    setData(data: any): any;
    getData(): any;
}>(st: S) => Either<never, [any, S]>;
declare function many<M, S extends ParserStream<M>, A>(p: Parser<M, S, unknown, A>): Parser<M, S, never, A[]>;
declare function pwhile<M, S extends ParserStream<M>, E, T>(cond: Parser<M, S, unknown, unknown>, body: Parser<M, S, E, T>): Parser<M, S, E, T[]>;
declare function oneOrMore<M, S extends ParserStream<M>, E, A>(p: Parser<M, S, E, A>): Parser<M, S, E, A[]>;
declare function separated<M, S extends ParserStream<M>, E, T>(p: Parser<M, S, E, T>, sep: Parser<M, S, unknown, unknown>): Parser<M, S, E, T[]>;
declare function separatedZero<M, S extends ParserStream<M>, E, T>(p: Parser<M, S, E, T>, sep: Parser<M, S, unknown, unknown>): Parser<M, S, E, T[]>;
declare function separatedTrailing<M, S extends ParserStream<M>, E, T>(p: Parser<M, S, E, T>, sep: Parser<M, S, unknown, unknown>): Parser<M, S, E, T[]>;
declare function separatedZeroTrailing<M, S extends ParserStream<M>, E, T>(p: Parser<M, S, E, T>, sep: Parser<M, S, unknown, unknown>): Parser<M, S, E, T[]>;
declare function peek<M, S extends ParserStream<M>, E, T>(p1: Parser<M, S, E, T>): Parser<M, S, E, T>;
declare function maybe<M, S extends ParserStream<M>, A>(p1: Parser<M, S, unknown, A>): Parser<M, S, never, A | undefined>;
declare function trai<M, S extends ParserStream<M>, E1, E2, A, B, C>(p1: Parser<M, S, E1, A>, p2: Parser<M, S, E2, B>, f: (a: A, b: B) => C): Parser<M, S, E2, C | undefined>;
declare function recover<M, S extends ParserStream<M>, E1, E2, A, B>(p1: Parser<M, S, E1, A>, f: (e: E1) => Parser<M, S, E2, B>): Parser<M, S, E2, A | B>;
declare function inspect<M, S extends ParserStream<M>, E1, E2, A, B>(p1: Parser<M, S, E1, A>, f: (e: A) => Parser<M, S, E2, B>): Parser<M, S, E1 | E2, B>;
declare function satisfy<M, S extends ParserStream<M>, E>(f: (x: M) => boolean, e: E): Parser<M, S, EosReached | E, M>;
