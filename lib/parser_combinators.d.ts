export { Parser, ParserStream, EosReached, EosExpected, map, mapError, many, oneOrMore, separated, pwhile, peek, maybe, trai, satisfy, any, eos, not, terminated, pconst, pfail, genericAlt, genericChoice, genericCombine, getData, setData, recover, inspect, Left, Right, Either, Literal, Any, left, right, pair };
declare type Any = {} | undefined | null;
declare type Left<L> = {
    kind: 'left';
    value: L;
};
declare type Right<R> = {
    kind: 'right';
    value: R;
};
declare type Either<L, R> = Left<L> | Right<R>;
declare type Literal = boolean | string | number | null | undefined | object;
interface ParserStream<S> {
    getData(): any;
    setData(data: any): this;
    next(this: this): [S, this] | null;
}
declare type Parser<M, S extends ParserStream<M>, E, T> = (st: S) => Either<E, [T, S]>;
declare type EosReached = {
    kind: 'pc_error';
    code: 'eos_reached';
};
declare type EosExpected = {
    kind: 'pc_error';
    code: 'eos_expected';
};
declare function left<L>(value: L): Left<L>;
declare function right<R>(value: R): Right<R>;
declare function pair<F extends Literal, S>(fst: F, snd: S): [F, S];
declare function map<M, S extends ParserStream<M>, E, A, B>(p: Parser<M, S, E, A>, f: (a: A) => B): Parser<M, S, E, B>;
declare function mapError<M, S extends ParserStream<M>, E1, E2, T>(p: Parser<M, S, E1, T>, f: (e: E1) => E2): Parser<M, S, E2, T>;
declare function any<M, S extends ParserStream<M>>(st: S): Either<EosReached, [M, S]>;
declare function eos<S extends ParserStream<Any>>(st: S): Either<EosExpected, [undefined, S]>;
declare function terminated<M, S extends ParserStream<M>, E, T>(p: Parser<M, S, E, T>): Parser<M, S, EosExpected | E, T>;
declare function pconst<T extends Literal>(x: T): <S>(st: S) => Either<never, [T, S]>;
declare function pfail<E extends Literal>(e: E): <S>(_: S) => Either<E, never>;
declare function not<M, S extends ParserStream<M>, E, T>(p: Parser<M, S, E, T>): Parser<M, S, T, E>;
declare function getData<S extends ParserStream<any>>(st: S): Either<never, [any, S]>;
declare function setData(data: any): <S extends {
    setData(data: any): any;
}>(st: S) => Either<never, [undefined, S]>;
declare function genericAlt<M, S extends ParserStream<M>, E, T>(parsers: Parser<M, S, E, T>[]): Parser<M, S, E, T>;
declare function genericCombine<M, S extends ParserStream<M>, E, A, B>(parsers: Parser<M, S, E, A>[], f: (...values: A[]) => B): Parser<M, S, E, B>;
declare function many<M, S extends ParserStream<M>, A>(p: Parser<M, S, Any, A>): Parser<M, S, never, A[]>;
declare function pwhile<M, S extends ParserStream<M>, E, T>(cond: Parser<M, S, Any, Any>, body: Parser<M, S, E, T>): Parser<M, S, E, T[]>;
declare function oneOrMore<M, S extends ParserStream<M>, E, A>(p: Parser<M, S, E, A>): Parser<M, S, E, A[]>;
declare function separated<M, S extends ParserStream<M>, Е, T>(p: Parser<M, S, Е, T>, sep: Parser<M, S, Any, Any>): Parser<M, S, Е, T[]>;
declare function peek<M, S extends ParserStream<M>, E>(p1: Parser<M, S, E, Any>): Parser<M, S, E, true>;
declare function maybe<M, S extends ParserStream<M>, A>(p1: Parser<M, S, Any, A>): Parser<M, S, never, A | undefined>;
declare function trai<M, S extends ParserStream<M>, E1, E2, A, B, C>(p1: Parser<M, S, E1, A>, p2: Parser<M, S, E2, B>, f: (a: A, b: B) => C): Parser<M, S, E2, C | undefined>;
declare function recover<M, S extends ParserStream<M>, E1, E2, A, B>(p1: Parser<M, S, E1, A>, f: (e: E1) => Parser<M, S, E2, B>): Parser<M, S, E2, A | B>;
declare function inspect<M, S extends ParserStream<M>, E1, E2, A, B>(p1: Parser<M, S, E1, A>, f: (e: A) => Parser<M, S, E2, B>): Parser<M, S, E1 | E2, B>;
declare function satisfy<M, S extends ParserStream<M>, E>(f: (x: M) => boolean, e: E): Parser<M, S, E, M>;
declare function genericChoice<M, S extends ParserStream<M>, E1, E2, T>(parsers: [Parser<M, S, E1, Any>, Parser<M, S, E2, T>][]): Parser<M, S, E1 | E2, T>;
export declare function alt<M, S extends ParserStream<M>, E, T1, T2>(p1: Parser<M, S, Any, T1>, p2: Parser<M, S, E, T2>): Parser<M, S, E, T1 | T2>;
export declare function alt3<M, S extends ParserStream<M>, E, T1, T2, T3>(p1: Parser<M, S, Any, T1>, p2: Parser<M, S, Any, T2>, p3: Parser<M, S, E, T3>): Parser<M, S, E, T1 | T2 | T3>;
export declare function alt4<M, S extends ParserStream<M>, E, T1, T2, T3, T4>(p1: Parser<M, S, Any, T1>, p2: Parser<M, S, Any, T2>, p3: Parser<M, S, Any, T3>, p4: Parser<M, S, E, T4>): Parser<M, S, E, T1 | T2 | T3 | T4>;
export declare function alt5<M, S extends ParserStream<M>, E, T1, T2, T3, T4, T5>(p1: Parser<M, S, Any, T1>, p2: Parser<M, S, Any, T2>, p3: Parser<M, S, Any, T3>, p4: Parser<M, S, Any, T4>, p5: Parser<M, S, E, T5>): Parser<M, S, E, T1 | T2 | T3 | T4 | T5>;
export declare function alt6<M, S extends ParserStream<M>, E, T1, T2, T3, T4, T5, T6>(p1: Parser<M, S, Any, T1>, p2: Parser<M, S, Any, T2>, p3: Parser<M, S, Any, T3>, p4: Parser<M, S, Any, T4>, p5: Parser<M, S, Any, T5>, p6: Parser<M, S, E, T6>): Parser<M, S, E, T1 | T2 | T3 | T4 | T5 | T6>;
export declare function alt7<M, S extends ParserStream<M>, E, T1, T2, T3, T4, T5, T6, T7>(p1: Parser<M, S, Any, T1>, p2: Parser<M, S, Any, T2>, p3: Parser<M, S, Any, T3>, p4: Parser<M, S, Any, T4>, p5: Parser<M, S, Any, T5>, p6: Parser<M, S, Any, T6>, p7: Parser<M, S, E, T7>): Parser<M, S, E, T1 | T2 | T3 | T4 | T5 | T6 | T7>;
export declare function alt8<M, S extends ParserStream<M>, E, T1, T2, T3, T4, T5, T6, T7, T8>(p1: Parser<M, S, Any, T1>, p2: Parser<M, S, Any, T2>, p3: Parser<M, S, Any, T3>, p4: Parser<M, S, Any, T4>, p5: Parser<M, S, Any, T5>, p6: Parser<M, S, Any, T6>, p7: Parser<M, S, Any, T7>, p8: Parser<M, S, E, T8>): Parser<M, S, E, T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8>;
export declare function combine<M, S extends ParserStream<M>, E1, E2, T1, T2, T3>(p1: Parser<M, S, E1, T1>, p2: Parser<M, S, E2, T2>, f: (a1: T1, a2: T2) => T3): Parser<M, S, E1 | E2, T3>;
export declare function combine3<M, S extends ParserStream<M>, E1, E2, E3, T1, T2, T3, T4>(p1: Parser<M, S, E1, T1>, p2: Parser<M, S, E2, T2>, p3: Parser<M, S, E3, T3>, f: (a1: T1, a2: T2, a3: T3) => T4): Parser<M, S, E1 | E2 | E3, T4>;
export declare function combine4<M, S extends ParserStream<M>, E1, E2, E3, E4, T1, T2, T3, T4, T5>(p1: Parser<M, S, E1, T1>, p2: Parser<M, S, E2, T2>, p3: Parser<M, S, E3, T3>, p4: Parser<M, S, E4, T4>, f: (a1: T1, a2: T2, a3: T3, a4: T4) => T5): Parser<M, S, E1 | E2 | E3 | E4, T5>;
export declare function combine5<M, S extends ParserStream<M>, E1, E2, E3, E4, E5, T1, T2, T3, T4, T5, T6>(p1: Parser<M, S, E1, T1>, p2: Parser<M, S, E2, T2>, p3: Parser<M, S, E3, T3>, p4: Parser<M, S, E4, T4>, p5: Parser<M, S, E5, T5>, f: (a1: T1, a2: T2, a3: T3, a4: T4, a5: T5) => T6): Parser<M, S, E1 | E2 | E3 | E4 | E5, T6>;
export declare function combine6<M, S extends ParserStream<M>, E1, E2, E3, E4, E5, E6, T1, T2, T3, T4, T5, T6, T7>(p1: Parser<M, S, E1, T1>, p2: Parser<M, S, E2, T2>, p3: Parser<M, S, E3, T3>, p4: Parser<M, S, E4, T4>, p5: Parser<M, S, E5, T5>, p6: Parser<M, S, E6, T6>, f: (a1: T1, a2: T2, a3: T3, a4: T4, a5: T5, a6: T6) => T7): Parser<M, S, E1 | E2 | E3 | E4 | E5 | E6, T7>;
export declare function combine7<M, S extends ParserStream<M>, E1, E2, E3, E4, E5, E6, E7, T1, T2, T3, T4, T5, T6, T7, T8>(p1: Parser<M, S, E1, T1>, p2: Parser<M, S, E2, T2>, p3: Parser<M, S, E3, T3>, p4: Parser<M, S, E4, T4>, p5: Parser<M, S, E5, T5>, p6: Parser<M, S, E6, T6>, p7: Parser<M, S, E7, T7>, f: (a1: T1, a2: T2, a3: T3, a4: T4, a5: T5, a6: T6, a7: T7) => T8): Parser<M, S, E1 | E2 | E3 | E4 | E5 | E6 | E7, T8>;
export declare function combine8<M, S extends ParserStream<M>, E1, E2, E3, E4, E5, E6, E7, E8, T1, T2, T3, T4, T5, T6, T7, T8, T9>(p1: Parser<M, S, E1, T1>, p2: Parser<M, S, E2, T2>, p3: Parser<M, S, E3, T3>, p4: Parser<M, S, E4, T4>, p5: Parser<M, S, E5, T5>, p6: Parser<M, S, E6, T6>, p7: Parser<M, S, E7, T7>, p8: Parser<M, S, E8, T8>, f: (a1: T1, a2: T2, a3: T3, a4: T4, a5: T5, a6: T6, a7: T7, a8: T8) => T9): Parser<M, S, E1 | E2 | E3 | E4 | E5 | E6 | E7 | E8, T9>;
export declare function choice<M, S extends ParserStream<M>, E1, E2, E3, T1, T2>(p1: [Parser<M, S, Any, Any>, Parser<M, S, E1, T1>], p2: [Parser<M, S, E3, Any>, Parser<M, S, E2, T2>]): Parser<M, S, E1 | E2 | E3, T1 | T2>;
export declare function choice3<M, S extends ParserStream<M>, E1, E2, E3, E4, T1, T2, T3>(p1: [Parser<M, S, Any, Any>, Parser<M, S, E1, T1>], p2: [Parser<M, S, Any, Any>, Parser<M, S, E2, T2>], p3: [Parser<M, S, E4, Any>, Parser<M, S, E3, T3>]): Parser<M, S, E1 | E2 | E3 | E4, T1 | T2 | T3>;
export declare function choice4<M, S extends ParserStream<M>, E1, E2, E3, E4, E5, T1, T2, T3, T4>(p1: [Parser<M, S, Any, Any>, Parser<M, S, E1, T1>], p2: [Parser<M, S, Any, Any>, Parser<M, S, E2, T2>], p3: [Parser<M, S, Any, Any>, Parser<M, S, E3, T3>], p4: [Parser<M, S, E5, Any>, Parser<M, S, E4, T4>]): Parser<M, S, E1 | E2 | E3 | E4 | E5, T1 | T2 | T3 | T4>;
export declare function choice5<M, S extends ParserStream<M>, E1, E2, E3, E4, E5, E6, T1, T2, T3, T4, T5>(p1: [Parser<M, S, Any, Any>, Parser<M, S, E1, T1>], p2: [Parser<M, S, Any, Any>, Parser<M, S, E2, T2>], p3: [Parser<M, S, Any, Any>, Parser<M, S, E3, T3>], p4: [Parser<M, S, Any, Any>, Parser<M, S, E4, T4>], p5: [Parser<M, S, E6, Any>, Parser<M, S, E5, T5>]): Parser<M, S, E1 | E2 | E3 | E4 | E5 | E6, T1 | T2 | T3 | T4 | T5>;
export declare function choice6<M, S extends ParserStream<M>, E1, E2, E3, E4, E5, E6, E7, T1, T2, T3, T4, T5, T6>(p1: [Parser<M, S, Any, Any>, Parser<M, S, E1, T1>], p2: [Parser<M, S, Any, Any>, Parser<M, S, E2, T2>], p3: [Parser<M, S, Any, Any>, Parser<M, S, E3, T3>], p4: [Parser<M, S, Any, Any>, Parser<M, S, E4, T4>], p5: [Parser<M, S, Any, Any>, Parser<M, S, E5, T5>], p6: [Parser<M, S, E7, Any>, Parser<M, S, E6, T6>]): Parser<M, S, E1 | E2 | E3 | E4 | E5 | E6 | E7, T1 | T2 | T3 | T4 | T5 | T6>;
export declare function choice7<M, S extends ParserStream<M>, E1, E2, E3, E4, E5, E6, E7, E8, T1, T2, T3, T4, T5, T6, T7>(p1: [Parser<M, S, Any, Any>, Parser<M, S, E1, T1>], p2: [Parser<M, S, Any, Any>, Parser<M, S, E2, T2>], p3: [Parser<M, S, Any, Any>, Parser<M, S, E3, T3>], p4: [Parser<M, S, Any, Any>, Parser<M, S, E4, T4>], p5: [Parser<M, S, Any, Any>, Parser<M, S, E5, T5>], p6: [Parser<M, S, Any, Any>, Parser<M, S, E6, T6>], p7: [Parser<M, S, E8, Any>, Parser<M, S, E7, T7>]): Parser<M, S, E1 | E2 | E3 | E4 | E5 | E6 | E7 | E8, T1 | T2 | T3 | T4 | T5 | T6 | T7>;
export declare function choice8<M, S extends ParserStream<M>, E1, E2, E3, E4, E5, E6, E7, E8, E9, T1, T2, T3, T4, T5, T6, T7, T8>(p1: [Parser<M, S, Any, Any>, Parser<M, S, E1, T1>], p2: [Parser<M, S, Any, Any>, Parser<M, S, E2, T2>], p3: [Parser<M, S, Any, Any>, Parser<M, S, E3, T3>], p4: [Parser<M, S, Any, Any>, Parser<M, S, E4, T4>], p5: [Parser<M, S, Any, Any>, Parser<M, S, E5, T5>], p6: [Parser<M, S, Any, Any>, Parser<M, S, E6, T6>], p7: [Parser<M, S, Any, Any>, Parser<M, S, E7, T7>], p8: [Parser<M, S, E9, Any>, Parser<M, S, E8, T8>]): Parser<M, S, E1 | E2 | E3 | E4 | E5 | E6 | E7 | E8 | E9, T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8>;
