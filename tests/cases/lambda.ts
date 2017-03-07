
import { test } from '../test_util'

import {
    char, oneOf,

    CharNotExpected, StringMismatch,

    TextStream, StringParser
} from '../../src/string_combinators'

import {
    map, alt, alt3, many, combine, combine3, combine4, terminated,

    satisfy as psat,
    oneOrMore as many1
} from '../../src/parser_combinators'


/* Types */
type Literal     = { kind: 'literal',     value: number }
type Reference   = { kind: 'reference',   ref:   string }
type Application = { kind: 'application', func:  Expr,   arg:  Expr }
type Lambda      = { kind: 'lambda',      param: string, body: Expr }

type Expr = Literal | Reference | Application | Lambda


/* Constructors */
function literal(value: number): Literal {
    return { kind: 'literal', value };
}

function reference(ref: string): Reference {
    return { kind: 'reference', ref };
}

function application(func: Expr, arg: Expr): Application {
    return { kind: 'application', func, arg };
}

function lambda(param: string, body: Expr): Lambda {
    return { kind: 'lambda', param, body };
}


/* Parsers */
const parseWs    = many1(oneOf(' \t'));
const parseNum   = many1(oneOf('1234567890'));

const parseId    = alt(
    oneOf('+-*/⊥'),
    map(
        many1(psat<char, TextStream, CharNotExpected>(
            x => /[a-zA-Z]/.test(x),
            { kind: 'pc_error', code: 'char_not_expected', expected: '[a-zA-Z]' }
        )),
        parts => parts.join('')
    )
);

// Lambda = 'λ' Id '.' Expr
const parseLambda = combine4(
    char('λ'),
    parseId,
    char('.'),
    st => parseExpr(st),
    (_1, param, _2, body) => lambda(param, body)
);

// ExprNoAp = Literal
//          | Ref           -- ref <$> id
//          | '(' Expr ')'
const parseExprNoAp = alt3(
    map(parseNum, n   => literal(+n.join(''))),
    map(parseId,  ref => reference(ref)),
    combine3(char('('), st => parseExpr(st), char(')'), (_1, e, _2) => e)
);

// Expr = Lambda
//      | ExprNoAp (' ' ExprNoAp)*
const parseExpr: StringParser<StringMismatch, Expr> = alt(
    parseLambda,
    combine(
        parseExprNoAp,
        many(combine(parseWs, parseExprNoAp, (_, expr) => expr)),
        (head, rest) => rest.reduce(application, head)
    )
);

const parseProgram = terminated(parseExpr);

test(parseProgram, 'λf.f (λx.x) + 1');
test(parseProgram, '(λf.λx.f x) + 1');
test(parseProgram, 'λf.f λx.x + 1');
test(parseProgram, 'λx.λxs.λcc.λcn.cc x xs');
test(parseProgram, 'λtrue.λfalse.true (true false)');
