
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
    ${times(n-1, x => `p${x}: Parser<M, S, Any, T${x}>`).join(',\n    ')},
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
    return genericCombine<M, S, ${times(n, x => 'E'+x).join('|')}, ${times(n, x => 'T'+x).join('|')}, ${'T'+(n+1)}>([${times(n, x => 'p'+x).join(', ')}], f);
}`
);
}

function generateChoice(n) {
    return (
`export function choice${n}<M, S extends ParserStream<M>, ${times(n+1, x => 'E'+x).join(', ')}, ${times(n, x => 'T'+x).join(', ')}>(
    ${times(n-1, x => `p${x}: [Parser<M, S, Any, Any>, Parser<M, S, E${x}, T${x}>]`).join(',\n    ')},
    p${n}: [Parser<M, S, E${n+1}, Any>, Parser<M, S, E${n}, T${n}>]
): Parser<M, S, ${times(n+1, x => 'E'+x).join('|')}, ${times(n, x => 'T'+x).join('|')}> {
    return genericChoice<M, S, any, ${times(n, x => 'E'+x).join('|')}, ${times(n, x => 'T'+x).join('|')}>([${times(n, x => 'p'+x).join(', ')}]);
}`
);
}

const OVERLOAD_COUNT = 8;

const code = [ generateAlt, generateCombine, generateChoice ]
    .map(f => times(OVERLOAD_COUNT, f, 2).join('\n\n'))
    .join('\n\n')
    .replace(/(combine|alt|choice)2/g, '$1');

const fs = require('fs');

const srcPath = __dirname + '/../src/parser_combinators.ts'
const source  = fs.readFileSync(srcPath);

const MARKER = '/* ======= GENERATED ======== */'
const newSource = source.slice(0, source.indexOf(MARKER) + MARKER.length)
    + '\n\n' + code + '\n';

// console.log(newSource);
fs.writeFileSync(srcPath, newSource);
