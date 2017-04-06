
import { test } from '../test_util'

import {
    char, integer, ws, asciiId, stringChoice,

    StringMismatch,

    StringParser
} from '../../src/string_combinators'

import {
    map, mapError, alt3, many, maybe, pconst, combine, combine3, combine4, terminated,

    oneOrMore as many1
} from '../../src/parser_combinators'


/* Types */
type ArithOp = 'add' | 'sub' | 'mul' | 'div'
// type Value = { kind: 'int_value', value: number }
//            | { kind: 'function', name: string, params: string[], body: Expr }

type Expr = { kind: 'constant', value: number }
          | { kind: 'arith', op: ArithOp, left: Expr, right: Expr }
          | { kind: 'var', name: string }
          | { kind: 'application', func: Expr, args: Expr[] }

type Declaration = { kind: 'function_decl', name: string, params: string[], body: Expr }
type Program     = { kind: 'program', body: Declaration[] }


/* Constructors */
function mkConstant(value: number): Expr {
    return { kind: 'constant', value };
}

function mkArith(op: ArithOp, left: Expr, right: Expr): Expr {
    return { kind: 'arith', op, left, right };
}

function mkVar(name: string): Expr {
    return { kind: 'var', name };
}

function mkApplication(func: Expr, args: Expr[]): Expr {
    return { kind: 'application', func, args };
}

function mkFunctionDecl(name: string, params: string[], body: Expr): Declaration {
    return { kind: 'function_decl', name, params, body };
}

function mkProgram(body: Declaration[]): Program {
    return { kind: 'program', body };
}


/* Parsers */
const skipWs     = maybe(ws);
const parseWs    = many1(ws);

const parseConstant = map(integer, x => mkConstant(+x));
const parseVar      = map(asciiId, x => mkVar(x));

const parseArithOp = stringChoice({
    "+": pconst<'add'>('add'),
    "-": pconst<'sub'>('sub'),
    "*": pconst<'mul'>('mul'),
    "/": pconst<'div'>('div')
});

// FunctionDecl = Id (' ' Id)* '=' Expr ';'
const parseFunctionDecl = combine4(
    asciiId,                                                                              // name
    many(combine(parseWs, asciiId, (_, id) => id)),                                       // params
    combine4(skipWs, char('='), skipWs, st => parseExpr(st), (_1, _2, _3, body) => body), // body

    mapError(combine(skipWs, char(';'), x => x), _ => ({ kind: 'pc_error' as 'pc_error', message: 'Did you forget `;` ?' })),

    mkFunctionDecl
);

// Declartion = FunctionDecl
const parseDeclaration = parseFunctionDecl;

const parseAtom = alt3(
    parseConstant,
    parseVar,
    combine3(
        combine(char('('), skipWs, _ => _),
        st => parseExpr(st),
        combine(skipWs, char(')'), _ => _),
        (_, expr) => expr
    )
);

// Application = Atom (' ' Atom)*
const parseApplication = combine(
    parseAtom,
    maybe(many1(combine(parseWs, parseAtom, (_, a) => a))),

    (func, args) => args ? mkApplication(func, args)
                         : func
);

// Arith = Application ('+'|'_'|'*'|'/') Arith
const parseArith: StringParser<StringMismatch, Expr> = combine3(
    parseApplication,
    skipWs,
    maybe(combine3(
        parseArithOp,
        skipWs,
        st => parseArith(st),
        (op, _, right) => ({ op, right })
    )),

    (left, _, r) => r ? mkArith(r.op, left, r.right)
                      : left
);

// Expr = Arith
const parseExpr = parseArith;

// Program = Declaration+
const parseProgram = terminated(combine(
    skipWs,
    many1(combine(parseDeclaration, skipWs, x => x)),
    (_, decls) => mkProgram(decls)
));


/* Test cases */
test(parseProgram, "main = 3 + 4");
test(parseProgram, "main = 3 + 4;");
test(parseProgram, "f x y = x * y; main = f 4 5 + 11;");
test(parseProgram, "c = 9; main = c;");
test(parseProgram, "c = 42; f x = x - c; main = f 29 + c;");
test(parseProgram, "x = 20; f x = x - 9; main = f 10;");
