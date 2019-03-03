
import { Parser, ParserStream } from './parser_combinators'

export function genericCombine<M, S extends ParserStream<M>, E, A, B>(
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

        return { kind: 'right', value: [ f(...results), cur ] };
    };
}

export function genericAlt<M, S extends ParserStream<M>, E, T>(parsers: Parser<M, S, E, T>[]): Parser<M, S, E, T> {
    if (!parsers.length) {
        throw new Error('No parsers provided');
    }
    if (!parsers.every(x => typeof x === 'function')) {
        throw new Error('Empty parser!');
    }

    return (st) => {
        let err = undefined;
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

export function genericChoice<M, S extends ParserStream<M>, E1, E2, T>(
    parsers: [Parser<M, S, E1, unknown>, Parser<M, S, E2, T>][]
): Parser<M, S, E1|E2, T> {
    if (!parsers.length) {
        throw new Error('No parsers provided');
    }
    if (!parsers.every(x => typeof x[0] === 'function' && typeof x[1] === 'function')) {
        throw new Error('Empty parser!');
    }

    return (st) => {
        let ret = undefined;
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

export function alt<M, S extends ParserStream<M>, E, T1, T2>(
    p1: Parser<M, S, unknown, T1>,
    p2: Parser<M, S, E, T2>
): Parser<M, S, E, T1|T2> {
    return genericAlt<M, S, any, T1|T2>([p1, p2]);
}

export function alt3<M, S extends ParserStream<M>, E, T1, T2, T3>(
    p1: Parser<M, S, unknown, T1>,
    p2: Parser<M, S, unknown, T2>,
    p3: Parser<M, S, E, T3>
): Parser<M, S, E, T1|T2|T3> {
    return genericAlt<M, S, any, T1|T2|T3>([p1, p2, p3]);
}

export function alt4<M, S extends ParserStream<M>, E, T1, T2, T3, T4>(
    p1: Parser<M, S, unknown, T1>,
    p2: Parser<M, S, unknown, T2>,
    p3: Parser<M, S, unknown, T3>,
    p4: Parser<M, S, E, T4>
): Parser<M, S, E, T1|T2|T3|T4> {
    return genericAlt<M, S, any, T1|T2|T3|T4>([p1, p2, p3, p4]);
}

export function alt5<M, S extends ParserStream<M>, E, T1, T2, T3, T4, T5>(
    p1: Parser<M, S, unknown, T1>,
    p2: Parser<M, S, unknown, T2>,
    p3: Parser<M, S, unknown, T3>,
    p4: Parser<M, S, unknown, T4>,
    p5: Parser<M, S, E, T5>
): Parser<M, S, E, T1|T2|T3|T4|T5> {
    return genericAlt<M, S, any, T1|T2|T3|T4|T5>([p1, p2, p3, p4, p5]);
}

export function alt6<M, S extends ParserStream<M>, E, T1, T2, T3, T4, T5, T6>(
    p1: Parser<M, S, unknown, T1>,
    p2: Parser<M, S, unknown, T2>,
    p3: Parser<M, S, unknown, T3>,
    p4: Parser<M, S, unknown, T4>,
    p5: Parser<M, S, unknown, T5>,
    p6: Parser<M, S, E, T6>
): Parser<M, S, E, T1|T2|T3|T4|T5|T6> {
    return genericAlt<M, S, any, T1|T2|T3|T4|T5|T6>([p1, p2, p3, p4, p5, p6]);
}

export function alt7<M, S extends ParserStream<M>, E, T1, T2, T3, T4, T5, T6, T7>(
    p1: Parser<M, S, unknown, T1>,
    p2: Parser<M, S, unknown, T2>,
    p3: Parser<M, S, unknown, T3>,
    p4: Parser<M, S, unknown, T4>,
    p5: Parser<M, S, unknown, T5>,
    p6: Parser<M, S, unknown, T6>,
    p7: Parser<M, S, E, T7>
): Parser<M, S, E, T1|T2|T3|T4|T5|T6|T7> {
    return genericAlt<M, S, any, T1|T2|T3|T4|T5|T6|T7>([p1, p2, p3, p4, p5, p6, p7]);
}

export function alt8<M, S extends ParserStream<M>, E, T1, T2, T3, T4, T5, T6, T7, T8>(
    p1: Parser<M, S, unknown, T1>,
    p2: Parser<M, S, unknown, T2>,
    p3: Parser<M, S, unknown, T3>,
    p4: Parser<M, S, unknown, T4>,
    p5: Parser<M, S, unknown, T5>,
    p6: Parser<M, S, unknown, T6>,
    p7: Parser<M, S, unknown, T7>,
    p8: Parser<M, S, E, T8>
): Parser<M, S, E, T1|T2|T3|T4|T5|T6|T7|T8> {
    return genericAlt<M, S, any, T1|T2|T3|T4|T5|T6|T7|T8>([p1, p2, p3, p4, p5, p6, p7, p8]);
}

export function combine<M, S extends ParserStream<M>, E1, E2, T1, T2, T3>(
    p1: Parser<M, S, E1, T1>,
    p2: Parser<M, S, E2, T2>,
    f: (a1: T1, a2: T2) => T3
): Parser<M, S, E1|E2, T3> {
    return genericCombine<M, S, E1|E2, any, T3>([p1, p2], f);
}

export function combine3<M, S extends ParserStream<M>, E1, E2, E3, T1, T2, T3, T4>(
    p1: Parser<M, S, E1, T1>,
    p2: Parser<M, S, E2, T2>,
    p3: Parser<M, S, E3, T3>,
    f: (a1: T1, a2: T2, a3: T3) => T4
): Parser<M, S, E1|E2|E3, T4> {
    return genericCombine<M, S, E1|E2|E3, any, T4>([p1, p2, p3], f);
}

export function combine4<M, S extends ParserStream<M>, E1, E2, E3, E4, T1, T2, T3, T4, T5>(
    p1: Parser<M, S, E1, T1>,
    p2: Parser<M, S, E2, T2>,
    p3: Parser<M, S, E3, T3>,
    p4: Parser<M, S, E4, T4>,
    f: (a1: T1, a2: T2, a3: T3, a4: T4) => T5
): Parser<M, S, E1|E2|E3|E4, T5> {
    return genericCombine<M, S, E1|E2|E3|E4, any, T5>([p1, p2, p3, p4], f);
}

export function combine5<M, S extends ParserStream<M>, E1, E2, E3, E4, E5, T1, T2, T3, T4, T5, T6>(
    p1: Parser<M, S, E1, T1>,
    p2: Parser<M, S, E2, T2>,
    p3: Parser<M, S, E3, T3>,
    p4: Parser<M, S, E4, T4>,
    p5: Parser<M, S, E5, T5>,
    f: (a1: T1, a2: T2, a3: T3, a4: T4, a5: T5) => T6
): Parser<M, S, E1|E2|E3|E4|E5, T6> {
    return genericCombine<M, S, E1|E2|E3|E4|E5, any, T6>([p1, p2, p3, p4, p5], f);
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
    return genericCombine<M, S, E1|E2|E3|E4|E5|E6, any, T7>([p1, p2, p3, p4, p5, p6], f);
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
    return genericCombine<M, S, E1|E2|E3|E4|E5|E6|E7, any, T8>([p1, p2, p3, p4, p5, p6, p7], f);
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
    return genericCombine<M, S, E1|E2|E3|E4|E5|E6|E7|E8, any, T9>([p1, p2, p3, p4, p5, p6, p7, p8], f);
}

export function choice<M, S extends ParserStream<M>, E1, E2, E3, T1, T2>(
    p1: [Parser<M, S, unknown, unknown>, Parser<M, S, E1, T1>],
    p2: [Parser<M, S, E3, unknown>, Parser<M, S, E2, T2>]
): Parser<M, S, E1|E2|E3, T1|T2> {
    return genericChoice<M, S, any, E1|E2, T1|T2>([p1, p2]);
}

export function choice3<M, S extends ParserStream<M>, E1, E2, E3, E4, T1, T2, T3>(
    p1: [Parser<M, S, unknown, unknown>, Parser<M, S, E1, T1>],
    p2: [Parser<M, S, unknown, unknown>, Parser<M, S, E2, T2>],
    p3: [Parser<M, S, E4, unknown>, Parser<M, S, E3, T3>]
): Parser<M, S, E1|E2|E3|E4, T1|T2|T3> {
    return genericChoice<M, S, any, E1|E2|E3, T1|T2|T3>([p1, p2, p3]);
}

export function choice4<M, S extends ParserStream<M>, E1, E2, E3, E4, E5, T1, T2, T3, T4>(
    p1: [Parser<M, S, unknown, unknown>, Parser<M, S, E1, T1>],
    p2: [Parser<M, S, unknown, unknown>, Parser<M, S, E2, T2>],
    p3: [Parser<M, S, unknown, unknown>, Parser<M, S, E3, T3>],
    p4: [Parser<M, S, E5, unknown>, Parser<M, S, E4, T4>]
): Parser<M, S, E1|E2|E3|E4|E5, T1|T2|T3|T4> {
    return genericChoice<M, S, any, E1|E2|E3|E4, T1|T2|T3|T4>([p1, p2, p3, p4]);
}

export function choice5<M, S extends ParserStream<M>, E1, E2, E3, E4, E5, E6, T1, T2, T3, T4, T5>(
    p1: [Parser<M, S, unknown, unknown>, Parser<M, S, E1, T1>],
    p2: [Parser<M, S, unknown, unknown>, Parser<M, S, E2, T2>],
    p3: [Parser<M, S, unknown, unknown>, Parser<M, S, E3, T3>],
    p4: [Parser<M, S, unknown, unknown>, Parser<M, S, E4, T4>],
    p5: [Parser<M, S, E6, unknown>, Parser<M, S, E5, T5>]
): Parser<M, S, E1|E2|E3|E4|E5|E6, T1|T2|T3|T4|T5> {
    return genericChoice<M, S, any, E1|E2|E3|E4|E5, T1|T2|T3|T4|T5>([p1, p2, p3, p4, p5]);
}

export function choice6<M, S extends ParserStream<M>, E1, E2, E3, E4, E5, E6, E7, T1, T2, T3, T4, T5, T6>(
    p1: [Parser<M, S, unknown, unknown>, Parser<M, S, E1, T1>],
    p2: [Parser<M, S, unknown, unknown>, Parser<M, S, E2, T2>],
    p3: [Parser<M, S, unknown, unknown>, Parser<M, S, E3, T3>],
    p4: [Parser<M, S, unknown, unknown>, Parser<M, S, E4, T4>],
    p5: [Parser<M, S, unknown, unknown>, Parser<M, S, E5, T5>],
    p6: [Parser<M, S, E7, unknown>, Parser<M, S, E6, T6>]
): Parser<M, S, E1|E2|E3|E4|E5|E6|E7, T1|T2|T3|T4|T5|T6> {
    return genericChoice<M, S, any, E1|E2|E3|E4|E5|E6, T1|T2|T3|T4|T5|T6>([p1, p2, p3, p4, p5, p6]);
}

export function choice7<M, S extends ParserStream<M>, E1, E2, E3, E4, E5, E6, E7, E8, T1, T2, T3, T4, T5, T6, T7>(
    p1: [Parser<M, S, unknown, unknown>, Parser<M, S, E1, T1>],
    p2: [Parser<M, S, unknown, unknown>, Parser<M, S, E2, T2>],
    p3: [Parser<M, S, unknown, unknown>, Parser<M, S, E3, T3>],
    p4: [Parser<M, S, unknown, unknown>, Parser<M, S, E4, T4>],
    p5: [Parser<M, S, unknown, unknown>, Parser<M, S, E5, T5>],
    p6: [Parser<M, S, unknown, unknown>, Parser<M, S, E6, T6>],
    p7: [Parser<M, S, E8, unknown>, Parser<M, S, E7, T7>]
): Parser<M, S, E1|E2|E3|E4|E5|E6|E7|E8, T1|T2|T3|T4|T5|T6|T7> {
    return genericChoice<M, S, any, E1|E2|E3|E4|E5|E6|E7, T1|T2|T3|T4|T5|T6|T7>([p1, p2, p3, p4, p5, p6, p7]);
}

export function choice8<M, S extends ParserStream<M>, E1, E2, E3, E4, E5, E6, E7, E8, E9, T1, T2, T3, T4, T5, T6, T7, T8>(
    p1: [Parser<M, S, unknown, unknown>, Parser<M, S, E1, T1>],
    p2: [Parser<M, S, unknown, unknown>, Parser<M, S, E2, T2>],
    p3: [Parser<M, S, unknown, unknown>, Parser<M, S, E3, T3>],
    p4: [Parser<M, S, unknown, unknown>, Parser<M, S, E4, T4>],
    p5: [Parser<M, S, unknown, unknown>, Parser<M, S, E5, T5>],
    p6: [Parser<M, S, unknown, unknown>, Parser<M, S, E6, T6>],
    p7: [Parser<M, S, unknown, unknown>, Parser<M, S, E7, T7>],
    p8: [Parser<M, S, E9, unknown>, Parser<M, S, E8, T8>]
): Parser<M, S, E1|E2|E3|E4|E5|E6|E7|E8|E9, T1|T2|T3|T4|T5|T6|T7|T8> {
    return genericChoice<M, S, any, E1|E2|E3|E4|E5|E6|E7|E8, T1|T2|T3|T4|T5|T6|T7|T8>([p1, p2, p3, p4, p5, p6, p7, p8]);
}
