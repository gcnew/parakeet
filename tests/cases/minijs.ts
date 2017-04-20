
import { test } from '../test_util'

import * as C from '../../src/cache'

import {
    StringParser,

    char, anyChar as any, string, number, digit, ws, asciiId, oneOf, notOneOf, token,

    getLineCol
} from '../../src/string_combinators'

import {
    EosExpected, Any,

    pair, _1, _2, tagged,

    map, recover, pwhile, not, eos, many, peek, maybe, trai, pconst, pfail, inspect, separatedZero,
    alt, alt3, alt4, combine, combine3, combine4, choice, choice3, choice4, choice6, choice7,

    getData, forward,

    oneOrMore as many1
} from '../../src/parser_combinators'


/* Types */

type Token = {
    kind: 't_id' | 't_punct'| 't_operator' | 't_string' | 't_number',
    value: string,
    start: number,
    end: number
}

type LexError      = { kind: 'lex_error', message:  string, position: number }
type ExpectedFound = { kind: 'ef_error',  expected: string, found:    Token  }

/* Statement types */
interface ExprStatement   { kind: 'expr_statement',   expr:       Expr        }
interface ReturnStatement { kind: 'return_statement', expr:       Expr        }
interface BlockStatement  { kind: 'block_statement',  statements: Statement[] }

interface ConstDecl    { kind: 'const_decl',    name: string, expr:   Expr }
interface FunctionDecl { kind: 'function_decl', name: string, params: string[],       body:     BlockStatement }
interface IfStatement  { kind: 'if_statement',  cond: Expr,   ifTrue: BlockStatement, ifFalse?: BlockStatement }


/* Expression types */
interface MemberExpr  { kind: 'member_expr', obj: Expr,        prop:  string }
interface IndexExpr   { kind: 'index_expr',  obj: Expr,        index: Expr   }
interface CallExpr    { kind: 'call_expr',   fn:   Expr,       args:  Expr[] }
interface LambdaExpr  { kind: 'lambda_expr', params: string[], body:  Expr   }

interface UnaryExpr   { kind: 'unary_expr',   op:   string, expr:   Expr }
interface BinaryExpr  { kind: 'binary_expr',  op:   string, left:   Expr, right:   Expr }
interface TernaryExpr { kind: 'ternary_expr', cond: Expr,   ifTrue: Expr, ifFalse: Expr }

interface VarExpr     { kind: 'var_expr',     name:  string           }

/* Literals */
interface NumExpr     { kind: 'num_expr',     value: number           }
interface StrExpr     { kind: 'str_expr',     value: string           }
interface BoolExpr    { kind: 'bool_expr',    value: boolean          }
interface ArrayExpr   { kind: 'array_expr',   value: Expr[]           }
interface ObjectExpr  { kind: 'object_expr',  value: [string, Expr][] }

interface RegExpExpr  { kind: 'reg_exp_expr', pattern: string, flags: string }


/* Unions */
type Literal = NumExpr | StrExpr | BoolExpr | ArrayExpr | ObjectExpr | RegExpExpr

type Statement = FunctionDecl
               | ConstDecl
               | IfStatement
               | ExprStatement
               | BlockStatement
               | ReturnStatement

type Expr      = Literal
               | VarExpr
               | LambdaExpr
               | MemberExpr
               | IndexExpr
               | CallExpr
               | UnaryExpr
               | BinaryExpr
               | TernaryExpr

type Program = Statement[]


/* Constructors */
function mkFunction(name: string, params: string[], body: BlockStatement): FunctionDecl {
    return { kind: 'function_decl', name, params, body };
}

function mkLambdaExpr(params: string[], body: Expr): LambdaExpr {
    return { kind: 'lambda_expr', params, body };
}

function mkConstDecl(name: string, expr: Expr): ConstDecl {
    return { kind: 'const_decl', name, expr };
}

function mkIfStatement(cond: Expr, ifTrue: BlockStatement, ifFalse?: BlockStatement): IfStatement {
    return { kind: 'if_statement', cond, ifTrue, ifFalse };
}

function mkBlockStatement(statements: Statement[]): BlockStatement {
    return { kind: 'block_statement', statements };
}

function mkReturnStatement(expr: Expr): ReturnStatement {
    return { kind: 'return_statement', expr };
}

function mkExprStatement(expr: Expr): ExprStatement {
    return { kind: 'expr_statement', expr };
}

function mkNumExpr(value: number): NumExpr {
    return { kind: 'num_expr', value };
}

function mkStrExpr(value: string): StrExpr {
    return { kind: 'str_expr', value };
}

function mkBoolExpr(value: boolean): BoolExpr {
    return { kind: 'bool_expr', value };
}

function mkArrayExpr(value: Expr[]): ArrayExpr {
    return { kind: 'array_expr', value };
}

function mkObjectExpr(value: [string, Expr][]): ObjectExpr {
    return { kind: 'object_expr', value };
}

function mkRegExpExpr(pattern: string, flags: string): RegExpExpr {
    return { kind: 'reg_exp_expr', pattern, flags };
}

function mkVarExpr(name: string): VarExpr {
    return { kind: 'var_expr', name };
}

function mkCallExpr(fn: Expr, args: Expr[]): CallExpr {
    return { kind: 'call_expr', fn, args };
}

function mkMemberExpr(obj: Expr, prop: string): MemberExpr {
    return { kind: 'member_expr', obj, prop };
}

function mkIndexExpr(obj: Expr, index: Expr): IndexExpr {
    return { kind: 'index_expr', obj, index };
}

function mkUnary(op: string, expr: Expr): UnaryExpr {
    return { kind: 'unary_expr', op, expr };
}

function mkBinary(op: string, left: Expr, right: Expr): BinaryExpr {
    return { kind: 'binary_expr', op, left, right };
}

function mkTernary(cond: Expr, ifTrue: Expr, ifFalse: Expr): TernaryExpr {
    return { kind: 'ternary_expr', cond, ifTrue, ifFalse };
}

/* Token cacher */

const cache = C.cache(
    C.byPosAndParser(
        data => data.$cache,
        (data, cache) => data.$cache = cache
    ),
    false
);

/* Tokenizer */

const skipTrivia = token(
    pwhile(
        peek(alt3(ws, string('//'), string('/*'))),

        choice3(
            [ string('//'), many(notOneOf('\n'))                                      ],
            [ string('/*'), combine(pwhile(not(string('*/')), any), string('*/'), _1) ],
            [ pconst(true), many1(ws)                                                 ]
        )
    ),

    x => x,
    (_e, position): LexError => ({ kind: 'lex_error', message: 'unterminated_comment', position })
);

const lexString = combine3(
    char('\''),
    many(
        choice(
            [ char('\\'),   choice4(
                                [ char('n'),    pconst('\n') as StringParser<never, char> ], // TYH
                                [ char('r'),    pconst('\r') ],
                                [ char('t'),    pconst('\t') ],
                                [ pconst(true), any          ],
                            ) ],
            [ pconst(true), notOneOf('\'') ]
        )
    ),
    char('\''),

    (_, parts) => parts.join('')
);

const invalid_operator = pfail('invalid_operator');

// Not allowed:        ( ) [ ] { } ` ' " ,
// Can't start with:   / !
// Can't end with:     /
// Reserved:           ? . .. : :: = /= === => & -> <- # $ @ - + * \ | / ! ~ % > <
// Unary:              - + ! ~
// Non-binary:         . ! ? : ~ =
const operatorChar = oneOf('+-*/\\|&~^!=<>.?:#$@%');
const lexOperator = alt3(
    char('!'),
    char('/'),
    inspect(many1(operatorChar), xs => {
        const op = xs.join('');

        if (op[0] === '.') {
            if (op[op.length - 1] !== '.') {
                return invalid_operator;
            }

            return pconst(op);
        }

        if (op[0] === '/' || op[op.length -1] === '/') {
            return invalid_operator;
        }

        return pconst(op);
    })
);

function lex2token(lexer: StringParser<Any, string>, kind: Token['kind'], message: string) {
    return token(
        lexer,
        (value, start, end): Token => ({ kind, value, start, end }),
        (_, position): LexError => ({ kind: 'lex_error', message, position })
    );
}

const nextToken = cache(
    combine(
        alt4(
            lex2token(asciiId,           't_id',       'identifier_expected'),
            lex2token(oneOf('()[]{},;'), 't_punct',    'punctuation_expected'),
            lex2token(lexOperator,       't_operator', 'operator_expected'),
            choice3(
                [ peek(digit),      lex2token(number,    't_number', 'number_expected')     ],
                [ peek(char('\'')), lex2token(lexString, 't_string', 'unterminated_string') ],
                [ pconst(true),     token(
                                        inspect(any, _ => pfail(false)),
                                        (x: never) => x,
                                        (e, position): LexError => ({
                                            kind: 'lex_error',
                                            message: e ? 'eos_reached': 'unexpected_character',
                                            position
                                        })
                                    ) ]
            )
        ),
        skipTrivia,

        _1
    )
);

const UNARY = '!-+~';
const tUnary = inspect(nextToken, t => {
    if (t.kind !== 't_operator') {
        return pfail<ExpectedFound>({ kind: 'ef_error', expected: 'unary_operator', found: t });
    }

    if (t.value.length !== 1 || UNARY.indexOf(t.value) === -1) {
        return pfail<ExpectedFound>({ kind: 'ef_error', expected: 'unary_operator', found: t });
    }

    return pconst(t);
});

const NON_BINARY = '.!?:~=';
const tBinary = inspect(nextToken, t => {
    if (t.kind !== 't_operator') {
        return pfail<ExpectedFound>({ kind: 'ef_error', expected: 'binary_operator', found: t });
    }

    if (t.value.length === 1 && NON_BINARY.indexOf(t.value) !== -1) {
        return pfail<ExpectedFound>({ kind: 'ef_error', expected: 'binary_operator', found: t });
    }

    return pconst(t);
});

const lexRange = combine3(
    char('['),
    many(choice(
        [ char('\n'),    pfail('unterminated_regexp') as StringParser<string, never> ], // TYH
        [ pconst(true),  notOneOf(']') ]
    )),
    char(']'),

    (o, b, c) => o + b.join('') + c
);

const tRegExp = cache(combine(
    token(
        combine4(
            char('/'),
            many(
                choice4(
                    [ peek(char('[')),      lexRange                                  ],
                    [ peek(char('\\')),     combine(char('\\'), any, (x, y) => x + y) ],
                    [ char('\n'),           pfail('unterminated_regexp')              ],
                    [ pconst(true),         notOneOf('/')                             ]
                )
            ),
            char('/'),
            many(oneOf('igm')),

            (_1, pattern, _2, flags) => mkRegExpExpr(pattern.join(''), flags.join(''))
        ),
        x => x,
        (_e, position): LexError => ({ kind: 'lex_error', message: 'unterminated_regexp', position: position })
    ),
    skipTrivia,

    _1
));

function expect(expected: string) {
    return inspect(nextToken, t => {
        if (t.value !== expected) {
            return pfail<ExpectedFound>({ kind: 'ef_error', expected: expected, found: t });
        }

        return pconst(t);
    });
}

function accept(kind: Token['kind']) {
    return inspect(nextToken, t => {
        if (t.kind !== kind) {
            return pfail<ExpectedFound>({ kind: 'ef_error', expected: kind, found: t });
        }

        return pconst(t);
    });
}


/* Parsers */

const parseExpr: StringParser<
    LexError|ExpectedFound,
    Expr
> = combine(
    forward(() => parseTernary),
    many(
        choice3(
            [ peek(expect('(')), map(forward(() => parseCallArgs), x => tagged('call', x))   ],
            [       expect('.'), map(              accept('t_id'), x => tagged('member', x)) ],
            [ peek(expect('[')), map(forward(() => parseIndex),    x => tagged('index', x))  ]
        )
    ),

    (prim, xs) => xs.reduce(
                      (e, p) => p.tag === 'call'   ? mkCallExpr(e, p.value)         :
                                p.tag === 'member' ? mkMemberExpr(e, p.value.value) :
                                p.tag === 'index'  ? mkIndexExpr(e, p.value)        : assertNever(p),
                      prim
                  )
);

const parseStatement: StringParser<
    LexError|ExpectedFound,
    Statement
> = combine(
    choice6(
        [ expect('const'),     forward(() => parseConstDecl)     ],
        [ expect('if'),        forward(() => parseIf)            ],
        [ expect('function'),  forward(() => parseFunctionDecl)  ],
        [ expect('return'),    map(parseExpr, mkReturnStatement) ],

        [ peek(expect('{')),   forward(() => parseBlock)         ],

        [ pconst(true),        map(parseExpr, mkExprStatement)   ]
    ),
    maybe(expect(';')),

    _1
);

const parseConstDecl = combine3(
    accept('t_id'), expect('='), parseExpr,

    (name, _, expr) => mkConstDecl(name.value, expr)
);

const parseBlock = combine3(
    expect('{'),
    pwhile(not(expect('}')), parseStatement),
    expect('}'),

    (_, statements) => mkBlockStatement(statements)
);

const parseParameters = combine3(
    expect('('),
    separatedZero(accept('t_id'), expect(',')),
    expect(')'),

    (_, params) => params.map(x => x.value)
);

// Function = "function" " "+ Id " "* Block
const parseFunctionDecl = combine3(
    accept('t_id'), parseParameters, parseBlock,

    (name, params, body) => mkFunction(name.value, params, body)
);

const parseIf = combine3(
    combine3(expect('('), parseExpr, expect(')'), _2),
    parseBlock,
    trai(expect('else'), parseBlock, _2),

    mkIfStatement
);

const parseArray = combine3(
    expect('['),
    separatedZero(parseExpr, expect(',')),
    expect(']'),

    (_, items) => mkArrayExpr(items)
);

const parseObject = combine3(
    expect('{'),
    separatedZero(
        combine3(
            choice(
                [ peek(char('\'')), accept('t_string') ],
                [ pconst(true),     accept('t_id')     ]   // TODO: numbers
            ),
            expect(':'),
            parseExpr,

            (prop, _, val) => pair(prop.value, val)
        ),
        expect(',')
    ),
    expect('}'),

    (_, props) => mkObjectExpr(props)
);

const lookIsLambda = combine(
    expect('('),
    choice(
        [ accept('t_id'),   alt(
                                expect(','),
                                combine(expect(')'), expect('=>'), _1)
                            ) ],
        [ pconst(true),     expect(')') ]
    ),

    _2
);

const parseLambdaOrPriority = choice(
    [ peek(lookIsLambda),   combine3(
                                parseParameters, expect('=>'), parseExpr,
                                (params, _, expr) => mkLambdaExpr(params, expr)
                            ) ],

    [ pconst(true),         combine3(
                                expect('('), parseExpr, expect(')'),
                                _2
                            ) ]
);

const parseCallArgs = combine3(
    expect('('),
    separatedZero(parseExpr, expect(',')),
    expect(')'),

    _2
);

const parseIndex = combine3(
    expect('['),
    parseExpr,
    expect(']'),

    _2
);

const parseIdOrLambda = combine(
    accept('t_id'),
    trai(expect('=>'), parseExpr, _2),

    (id, expr) => expr ? mkLambdaExpr([id.value], expr)
                       : mkVarExpr(id.value)
);

const parsePrimary0 = inspect(peek(nextToken), t => {
    if (t.kind === 't_string') return map(nextToken, t => mkStrExpr(t.value));
    if (t.kind === 't_number') return map(nextToken, t => mkNumExpr(+t.value));

    if (t.kind === 't_punct') {
        if (t.value === '[') return parseArray;
        if (t.value === '{') return parseObject;
        if (t.value === '(') return parseLambdaOrPriority;
    }

    if (t.kind === 't_operator') {
        if (t.value === '/') return tRegExp;
    }

    if (t.kind === 't_id') {
        if (t.value === 'true')  return map(nextToken, _ => mkBoolExpr(true));
        if (t.value === 'false') return map(nextToken, _ => mkBoolExpr(false));
    }

    return parseIdOrLambda;
});
void parsePrimary0;

const parsePrimary = choice7(
    [ peek(accept('t_string')),  map(nextToken, t => mkStrExpr(t.value))  ],
    [ peek(expect('[')),         parseArray                           ],
    [ peek(expect('{')),         parseObject                          ],
    [ peek(expect('(')),         parseLambdaOrPriority                ],
    [ peek(expect('/')),         tRegExp                              ],
    [ peek(accept('t_number')),  map(nextToken, t => mkNumExpr(+t.value)) ],
    [ pconst(true),              alt3(
                                     map(expect('true'),  _ => mkBoolExpr(true)),
                                     map(expect('false'), _ => mkBoolExpr(false)),
                                     parseIdOrLambda
                                 ) ]
);

const parseUnary = combine(
    many(tUnary),
    parsePrimary,

    (ops, expr) => ops.reduceRight((expr, op) => mkUnary(op.value, expr), expr)
);

const OPERATOR_TABLE: { [key: string]: number|undefined } = {
    '||':   5,
    '&&':  10,
    '|':   15,
    '^':   20,
    '&':   25,
    '===': 30, '!==': 30,
    '<':   35, '<=':  35, '>':   35, '>=': 35,
    '<<':  40, '>>':  40, '>>>': 40,
    '+':   45, '-':   45,
    '*':   50, '/':   50, '%':   50
};

function getPrecedenceStrict(op: string) {
    if (!OPERATOR_TABLE[op]) {
        throw new Error(`Inavlid operator: ${op}`);
    }

    return OPERATOR_TABLE[op]!;
}

function getPrecedenceLoose(op: string) {
    return OPERATOR_TABLE[op] || 1;
}

let getPrecedence = getPrecedenceStrict;

function parsePrecedenced(expr: Expr, rest: [string, Expr][]): Expr {
    const opStack = [];
    const exprStack = [expr];

    for (const [op, e] of rest) {
        const prec = getPrecedence(op);

        while (opStack.length && getPrecedence(opStack[opStack.length - 1])! >= prec) {
            const r = exprStack.pop();
            const l = exprStack.pop();

            exprStack.push(mkBinary(opStack.pop()!, l!, r!));
        }

        opStack.push(op);
        exprStack.push(e);
    }

    while (opStack.length) {
        const r = exprStack.pop();
        const l = exprStack.pop();

        exprStack.push(mkBinary(opStack.pop()!, l!, r!));
    }

    assert(exprStack.length === 1);
    return exprStack[0];
}

const parseBinary = combine(
    parseUnary,
    pwhile(
        peek(tBinary),
        combine(tBinary, parseUnary, (op, e) => pair(op.value, e))
    ),

    parsePrecedenced
);

const parseTernary = combine(
    parseBinary,
    trai(
        expect('?'),
        combine3(parseExpr, expect(':'), parseExpr, (ifTrue, _, ifFalse) => pair(ifTrue, ifFalse)),

        _2
    ),

    (cond, pair) => pair ? mkTernary(cond, pair[0], pair[1])
                         : cond
);

const parseProgram = combine(
    skipTrivia,
    pwhile(
        not(eos as StringParser<EosExpected, never>), // TYH
        parseStatement
    ),

    (_, prog: Program) => prog
);

const parseProgramPrettyErrors = recover(
    parseProgram,

    e => inspect(
        getData as StringParser<never, any>,

        (data): StringParser<string, never> => {
            const pos = e.kind === 'lex_error' ? e.position
                                               : e.found.start;

            const lineCol = getLineCol(pos, data.lineOffsetTable);

            if (!lineCol) {
                throw new Error('ASSERT: broken');
            }

            const message = e.kind === 'lex_error'
                ? e.message
                : `Expected: "${e.expected}" found "${e.found.value}" (${e.found.kind})`;

            return pfail(`${lineCol[0]+1}:${lineCol[1]+1}: Error: ${message}`);
        }
    )
);

/* Helper functions */

function assertNever(x: never): never {
    throw new Error(`ASSERT: never expected: ${x}`);
}

function assert(cond: boolean, msg?: string) {
    if (!cond) {
        throw new Error(msg || 'Assertion failed!');
    }
}

test(parseProgram,

`
{{
    {}
    function innerFunction(arg) {
    }
}}

if (true) {
    const x = 10;
}

if (false) {
    const y = 1;
} else {
    const y = 2;
}

const lambda1 = (x) => x;
const flip1 = f => (x,y) => f(y,x);

function lambda2(x){return x;}function flip2(f, x,y){return f(y,x)}


function main() {
    const s = 'hello world\\'\\n :D';
    const n = 42
    const id = x => x;
    const toString = x => x.toString();
    const const = x => y => x;
    const hard  = f(res.value[0])(res.value[1])

    return 3;
}
`);

test(parseProgram,
`
// This is a very important program //
/* It tests comments! */
function /*id*/ name(
    /* A */ a,
    /* B */ _  // ignored
) {
    return /**/a; // same as "const" in Haskell
}
`);

test(parseProgram, `1.toString()`);
test(parseProgram, `(1).toString()`);
test(parseProgram, `'hello'.length`);
test(parseProgram, `[1, 2, 3].map(_ => true)`);
test(parseProgram, `({ key: 'value', 'prop': 5 })`);
test(parseProgram, `const x = [1, 2, 3]; x[5];`);
test(parseProgram, `1 + 2 + 3 * 4;`);
test(parseProgram, `- !-1 || 3 && 1 + 2`);

test(parseProgram, `true ? 1 : 2`);
test(parseProgram, `a || b ? a ? 1 * 2 : 'hello' : b ? f(10) : o.p`);
test(parseProgram, `(true ? false : true) ? 'no' : 'yes'`);
test(parseProgram, `1 * 2 / 2 % 1`);
test(parseProgram, `/^[a-zA-Z][a-zA-Z0-9]*$/.test(id)`);
test(parseProgram, `/[/]/.test(id)`);
test(parseProgram, `/'\\/'/img`);
test(parseProgram, `'hello'.replace(/l/g, 'r')`);
test(parseProgram, `\`invalid\``);
test(parseProgram, `/hello`);
test(parseProgram, `'hello`);
test(parseProgram, `/*`);
test(parseProgram, `/hello//*`);
test(parseProgram, `'hello'/*`);
test(parseProgram, `hello/*`);
test(parseProgram, `1/*`);
test(parseProgram, `ok//`);
test(parseProgram, `obj.test(f, "fail");`);

test(parseProgramPrettyErrors, `const`);
test(parseProgramPrettyErrors, `const (`);
test(parseProgramPrettyErrors, `function f{`);

getPrecedence = getPrecedenceLoose;
test(parseProgram, `f >>= g >>= x => 5`);
