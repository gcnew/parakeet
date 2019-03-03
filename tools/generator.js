
function times(n, f, s = 1) {
    const result = [];

    for (var i = s; i <= n; ++i) {
        result.push(f(i));
    }

    return result;
}

function generateAlt(n) {
    return (
`export function alt${n}<M, S extends ParserStream<M>, E, ${times(n, x => 'T'+x).join(', ')}>(
    ${times(n-1, x => `p${x}: Parser<M, S, unknown, T${x}>`).join(',\n    ')},
    p${n}: Parser<M, S, E, T${n}>
): Parser<M, S, E, ${times(n, x => 'T'+x).join('|')}> {
    return genericAlt<M, S, any, ${times(n, x => 'T'+x).join('|')}>([${times(n, x => 'p'+x).join(', ')}]);
}`
);
}

function generateCombine(n) {
    return (
`export function combine${n}<M, S extends ParserStream<M>, ${times(n, x => 'E'+x).join(', ')}, ${times(n+1, x => 'T'+x).join(', ')}>(
    ${times(n, x => `p${x}: Parser<M, S, E${x}, T${x}>`).join(',\n    ')},
    f: (${times(n, x => `a${x}: T${x}`).join(', ')}) => ${'T'+(n+1)}
): Parser<M, S, ${times(n, x => 'E'+x).join('|')}, ${'T'+(n+1)}> {
    return genericCombine<M, S, ${times(n, x => 'E'+x).join('|')}, any, ${'T'+(n+1)}>([${times(n, x => 'p'+x).join(', ')}], f);
}`
);
}

function generateChoice(n) {
    return (
`export function choice${n}<M, S extends ParserStream<M>, ${times(n+1, x => 'E'+x).join(', ')}, ${times(n, x => 'T'+x).join(', ')}>(
    ${times(n-1, x => `p${x}: [Parser<M, S, unknown, unknown>, Parser<M, S, E${x}, T${x}>]`).join(',\n    ')},
    p${n}: [Parser<M, S, E${n+1}, unknown>, Parser<M, S, E${n}, T${n}>]
): Parser<M, S, ${times(n+1, x => 'E'+x).join('|')}, ${times(n, x => 'T'+x).join('|')}> {
    return genericChoice<M, S, any, ${times(n, x => 'E'+x).join('|')}, ${times(n, x => 'T'+x).join('|')}>([${times(n, x => 'p'+x).join(', ')}]);
}`
);
}

const OVERLOAD_COUNT = 8;
const PRELUDE = `
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

`;

const code = [ generateAlt, generateCombine, generateChoice ]
    .map(f => times(OVERLOAD_COUNT, f, 2).join('\n\n'))
    .join('\n\n')
    .replace(/(combine|alt|choice)2/g, '$1');

const fs = require('fs');

const outPath = __dirname + '/../src/generated_combinators.ts'
fs.writeFileSync(outPath, PRELUDE + code + '\n');
