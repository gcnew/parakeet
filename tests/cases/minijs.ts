
import { test } from '../test_util'

import {
    StringParser, TextStream, StringMismatch, AsciiAlphaExpected, CharNotExpected, DigitExpected,

    char, string, number, digit, ws, asciiId, oneOf
} from '../../src/string_combinators'

import {
    EosExpected,

    pair,

    map, pwhile, not, eos, many, peek, maybe, trai, pconst, pfail, inspect, separated, any,
    alt, alt3, combine, combine3, combine4, choice, choice3, choice4, choice6, choice7,

    oneOrMore as many1
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

type InvalidOperator    = { kind: 'pc_error', code: 'invalid_operator'    }
type UnterminatedRegExp = { kind: 'pc_error', code: 'unterminated_regexp' }


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


/* Parsers */
const comment = choice(
    [ string('//'), pwhile(not(char('\n')), any)                              ],
    [ string('/*'), combine(pwhile(not(string('*/')), any), string('*/'), _1) ]
);

const skipTrivia = many(alt(ws, comment));

const tId = t(asciiId);

const invalid_operator = pfail<InvalidOperator>({
    kind: 'pc_error',
    code: 'invalid_operator'
});

// Not allowed:        ( ) [ ] { } ` ' " ,
// Can't start with:   / !
// Can't end with:     /
// Reserved:           ? . .. : :: = /= === => & -> <- # $ @ - + * \ | / ! ~ % > <
// Unary:              - + ! ~
const operatorChar = oneOf('+-*/\\|&~^!=<>.?:#$@%');
const tOperator = alt3(
    ts('!'),
    ts('/'),
    t(inspect(many1(operatorChar), xs => {
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
    }))
);

const UNARY = '!-+~';
const tUnary = inspect(tOperator, op => {
    if (op.length === 1 && UNARY.indexOf(op) !== -1) {
        return pconst(op);
    }

    return invalid_operator;
});

const NON_BINARY = '.!?:~=';
const tBinary = inspect(tOperator, op => {
    if (op.length === 1 && NON_BINARY.indexOf(op) !== -1) {
        return invalid_operator;
    }

    return pconst(op);
});

const parseExpr: StringParser<
    StringMismatch|AsciiAlphaExpected|DigitExpected|CharNotExpected|InvalidOperator,
    Expr
> = combine(
    (st: TextStream) => parseTernary(st),
    many(
        choice3(
            [ peek(char('(')), map((st: TextStream) => parseCallArgs(st), x => tagged('call', x))   ],
            [         to('.'), map((st: TextStream) => tId(st),           x => tagged('member', x)) ],
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

const parseStatement: StringParser<
    InvalidOperator|DigitExpected|AsciiAlphaExpected|StringMismatch|CharNotExpected,
    Statement
> = combine(
    choice6(
        [ tk('const'),      st => parseConstDecl(st)          ],
        [ tk('if'),         st => parseIf(st)                 ],
        [ tk('function'),   st => parseFunctionDecl(st)       ],
        [ tk('return'),     map(parseExpr, mkReturnStatement) ],

        [ peek(char('{')),  st => parseBlock(st)              ],

        [ pconst(true),     map(parseExpr, mkExprStatement)   ]
    ),
    maybe(ts(';')),

    _1
);

const parseConstDecl = combine3(
    tId, to('='), parseExpr,

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
            [ peek(not(char('\''))), any ]
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
                to(':'),
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
        parseParameters, to('=>'), parseExpr,
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

const unterminated_regexp: UnterminatedRegExp = { kind: 'pc_error', code: 'unterminated_regexp' };

const skipRange = combine3(
    char('['),
    many(choice(
        [ char('\n'),           pfail(unterminated_regexp) as StringParser<UnterminatedRegExp, never> ], // TYH
        [ peek(not(char(']'))), any                        as StringParser<EosExpected, char>         ]  // TYH
    )),
    char(']'),

    (o, b, c) => o + b.join('') + c
);

const parseRegExp = combine4(
    char('/'),
    many(
        choice4(
            [ char('\n'),           pfail(unterminated_regexp) as StringParser<UnterminatedRegExp, never> ], // TYH
            [ peek(char('[')),      skipRange                                 ],
            [ peek(char('\\')),     combine(char('\\'), any, (x, y) => x + y) ],
            [ peek(not(char('/'))), any                                       ]
        )
    ),
    char('/'),
    t(many(oneOf('igm'))),

    (_1, pattern, _2, flags) => mkRegExpExpr(pattern.join(''), flags.join(''))
)

const parseIdOrLambda = combine(
    tId,
    trai(to('=>'), parseExpr, _2),

    (id, expr) => expr ? mkLambdaExpr([id], expr)
                       : mkVarExpr(id)
);

const parsePrimary = choice7(
    [ peek(char('\'')),  map(tStringLit, mkStrExpr)         ],
    [ peek(char('[')),   parseArray                         ],
    [ peek(char('{')),   parseObject                        ],
    [ peek(char('(')),   parseLambdaOrPriority              ],
    [ peek(char('/')),   parseRegExp                        ],
    [ peek(digit),       map(t(number), n => mkNumExpr(+n)) ],
    [ pconst(true),      alt3(
                            map(tk('true'),  _ => mkBoolExpr(true)),
                            map(tk('false'), _ => mkBoolExpr(false)),
                            parseIdOrLambda
                         ) ]
);

const parseUnary = combine(
    many(tUnary),
    parsePrimary,

    (ops, expr) => ops.reduceRight((expr, op) => mkUnary(op, expr), expr)
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
    many(
        combine(tBinary, parseUnary, pair)
    ),

    parsePrecedenced
);

const parseTernary = combine(
    parseBinary,
    trai(
        to('?'),
        combine3(parseExpr, to(':'), parseExpr, (ifTrue, _, ifFalse) => pair(ifTrue, ifFalse)),

        _2
    ),

    (cond, pair) => pair ? mkTernary(cond, pair[0], pair[1])
                         : cond
);

const parseProgram = combine(
    skipTrivia,
    pwhile(
        not(eos) as StringParser<EosExpected, never>,
        parseStatement
    ),

    (_, prog: Program) => prog
);

// token
function t<E, T>(p: StringParser<E, T>) {
    return combine(p, skipTrivia, _1);
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

// operator token
function to(s: string) {
    const sx   = pconst(s);
    const fail = pfail<StringMismatch>({ kind: 'pc_error', code: 'string_mismatch', expected: s });

    return inspect(tOperator, op => op === s ? sx
                                             : fail);
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

getPrecedence = getPrecedenceLoose;
test(parseProgram, `f >>= g >>= x => 5`);
