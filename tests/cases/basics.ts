
import { test } from '../test_util'

import {
    string, number, ws,

    withPosition, mapPositionToLineCol
} from '../../src/string_combinators'

import {
    map, many, combine, choice
} from '../../src/parser_combinators'

const ll = choice(
    [ string('num'), map(number, n => Number(n)) ],
    [ string('str'), string('hello') ]
);

const nn = map(number, x => +x);

const wp = mapPositionToLineCol(
    combine(many(ws), withPosition(number), (_, x) => x)
);

test(ll, 'strhello');
test(ll, 'strhello world');
test(nn, '123abc');
test(wp, '\n\n123');
test(wp, '\n\n   hello?');
