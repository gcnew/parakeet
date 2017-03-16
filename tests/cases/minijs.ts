
import { test } from '../test_util'

import {
    StringParser, TextStream, StringMismatch, AsciiAlphaExpected, DigitExpected,

    char, string, number, digit, ws, asciiId, withPosition, mapPositionToLineCol
} from '../../src/string_combinators'

import {
    EosExpected,

    map, pwhile, not, eos, alt, many, peek, maybe, trai, pconst, pfail, combine, combine3,
    choice, choice3, choice4, genericChoice, inspect, satisfy, separated, any, pair
} from '../../src/parser_combinators'


/* Types */

/* Statement types */
interface ExprStatement   { kind: 'expr_statement',   expr:       Expr        }
interface ReturnStatement { kind: 'return_statement', expr:       Expr        }
interface BlockStatement  { kind: 'block_statement',  statements: Statement[] }

interface ConstDecl    { kind: 'const_decl',    name: string, expr:   Expr }
interface FunctionDecl { kind: 'function_decl', name: string, params: string[],       body:     BlockStatement }
interface IfStatement  { kind: 'if_statement',  cond: Expr,   ifTrue: BlockStatement, ifFalse?: BlockStatement }


/* Expression types */
interface MemberExpr { kind: 'member_expr', obj: Expr,        prop:  string }
interface IndexExpr  { kind: 'index_expr',  obj: Expr,        index: Expr   }
interface CallExpr   { kind: 'call_expr',   fn:   Expr,       args:  Expr[] }
interface LambdaExpr { kind: 'lambda_expr', params: string[], body:  Expr   }

interface VarExpr    { kind: 'var_expr',    name:  string             }

/* Literals */
interface NumExpr    { kind: 'num_expr',    value: number             }
interface StrExpr    { kind: 'str_expr',    value: string             }
interface BoolExpr   { kind: 'bool_expr',   value: boolean            }
interface ArrayExpr  { kind: 'array_expr',  value: Expr[]             }
interface ObjectExpr { kind: 'object_expr', value: [string, Expr][]   }


/* Unions */
type Literal = NumExpr | StrExpr | BoolExpr | ArrayExpr | ObjectExpr

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

/* Parsers */
const skipWs = many(ws);

const tId = t(asciiId);

const parseExpr: StringParser<StringMismatch|AsciiAlphaExpected|DigitExpected, Expr> = combine(
    (st: TextStream) => parsePrimary(st),
    many(
        choice3(
            [ peek(char('(')), map((st: TextStream) => parseCallArgs(st), x => tagged('call', x))   ],
            [         ts('.'), map((st: TextStream) => tId(st),           x => tagged('member', x)) ],
            [ peek(char('[')), map((st: TextStream) => parseIndex(st),    x => tagged('index', x))  ]
        )
    ),

    (prim, xs) => xs.reduce(
                      (e, p) => p.tag === 'call'   ? mkCallExpr(e, p.value)   :
                                p.tag === 'member' ? mkMemberExpr(e, p.value) :
                                p.tag === 'index'  ? mkIndexExpr(e, p.value)  : assertNever(p),
                      prim
                  )
);

const parseStatement: StringParser<StringMismatch|AsciiAlphaExpected|DigitExpected, Statement> = combine(
    genericChoice<char, TextStream, StringMismatch|AsciiAlphaExpected, StringMismatch|AsciiAlphaExpected|DigitExpected, Statement>([
        [ tk('const'),      st => parseConstDecl(st)          ],
        [ tk('if'),         st => parseIf(st)                 ],
        [ tk('function'),   st => parseFunctionDecl(st)       ],
        [ tk('return'),     map(parseExpr, mkReturnStatement) ],

        [ peek(char('{')),  st => parseBlock(st)              ],

        [ pconst(true),     map(parseExpr, mkExprStatement)   ]
    ]),
    maybe(ts(';')),

    _1
);

const parseConstDecl = combine3(
    tId, ts('='), parseExpr,

    (name, _, expr) => mkConstDecl(name, expr)
);

const parseBlock = combine3(
    ts('{'),
    many(parseStatement),
    ts('}'),

    (_, statements) => mkBlockStatement(statements || [])
);

const parseParameters = combine3(
    ts('('),
    maybe(separated(tId, ts(','))),
    ts(')'),

    (_, params) => params || []
);

// Function = "function" " "+ Id " "* Block
const parseFunctionDecl = combine3(
    tId, parseParameters, parseBlock,

    mkFunction
);

const parseIf = combine3(
    combine3(ts('('), parseExpr, ts(')'), _2),
    parseBlock,
    trai(ts('else'), parseBlock, _2),

    mkIfStatement
);

const tStringLit = combine3(
    char('\''),
    many(
        choice(
            [ char('\\'), choice4(
                              [ char('n'),    pconst('\n') as StringParser<never, char> ],
                              [ char('r'),    pconst('\r') ],
                              [ char('t'),    pconst('\t') ],
                              [ pconst(true), any ],
                          ) ],
            [ peek(satisfy(c => c !== '\'', 'ignored') as StringParser<never, char>), any ]
        )
    ),
    ts('\''),

    (_, parts) => parts.join('')
);

const parseArray = combine3(
    ts('['),
    maybe(separated(parseExpr, ts(','))),
    ts(']'),

    (_, items) => mkArrayExpr(items || [])
);

const parseObject = combine3(
    ts('{'),
    maybe(
        separated(
            combine3(
                choice(
                    [ peek(char('\'')), tStringLit ],
                    [ pconst(true),     tId ]           // TODO: numbers
                ),
                ts(':'),
                parseExpr,

                (prop, _, val) => pair(prop, val)
            ),
            ts(',')
        )
    ),
    ts('}'),

    (_, props) => mkObjectExpr(props || [])
);

const parseLambdaOrPriority = alt(
    combine3(
        parseParameters, ts('=>'), parseExpr,
        (params, _, expr) => mkLambdaExpr(params, expr)
    ),
    combine3(
        ts('('), parseExpr, ts(')'),
        _2
    )
);

const parseCallArgs = combine3(
    ts('('),
    maybe(separated(parseExpr, ts(','))),
    ts(')'),

    (_, args) => args || []
);

const parseIndex = combine3(
    ts('['),
    parseExpr,
    ts(']'),

    _2
);

const parseIdOrLambda = combine(
    tId,
    trai(ts('=>'), parseExpr, _2),

    (id, expr) => expr ? mkLambdaExpr([id], expr)
                       : mkVarExpr(id)
);

const parsePrimary = genericChoice<
    char,
    TextStream,
    AsciiAlphaExpected|StringMismatch|DigitExpected,
    StringMismatch|AsciiAlphaExpected|DigitExpected,
    Expr
>([
    [ peek(char('\'')),  map(tStringLit, mkStrExpr)         ],
    [ peek(char('[')),   parseArray                         ],
    [ peek(char('{')),   parseObject                        ],
    [ peek(char('(')),   parseLambdaOrPriority              ],
    [ peek(digit),       map(t(number), n => mkNumExpr(+n)) ],
    [ tk('true'),        pconst(mkBoolExpr(true))           ],
    [ tk('false'),       pconst(mkBoolExpr(false))          ],
    [ pconst(true),      parseIdOrLambda                    ]
]);

const parseProgram = combine(
    skipWs,
    pwhile(
        not(eos) as StringParser<EosExpected, never>,
        parseStatement
    ),

    _2
);

// token
function t<E, T>(p: StringParser<E, T>) {
    return combine(p, skipWs, _1);
}

// keyword token
function tk(s: string) {
    const sx   = pconst(s);
    const fail = pfail<StringMismatch>({ kind: 'pc_error', code: 'string_mismatch', expected: s });

    return t(inspect(asciiId, id => id === s ? sx
                                             : fail));
}

// string token
function ts(s: string) {
    return t(string(s));
}

function _1<T>(x: T) {
    return x;
}

function _2<T>(_: any, x: T) {
    return x;
}

function tagged<T extends string, V>(tag: T, value: V) {
    return { tag, value };
}

function assertNever(x: never): never {
    throw new Error(`ASSERT: never expected: ${x}`);
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

test(parseProgram, `1.toString()`);
test(parseProgram, `(1).toString()`);
test(parseProgram, `'hello'.length`);
test(parseProgram, `[1, 2, 3].map(_ => true)`);
test(parseProgram, `({ key: 'value', 'prop': 5 })`);
test(parseProgram, `const x = [1, 2, 3]; x[5];`)
