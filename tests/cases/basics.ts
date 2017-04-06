
import { test } from '../test_util'

import {
    string, number, ws,

    withPosition, getLineCol
} from '../../src/string_combinators'

import {
    map, many, combine, choice,

    left, right, pair
} from '../../src/parser_combinators'


const ll = choice(
    [ string('num'), map(number, n => Number(n)) ],
    [ string('str'), string('hello') ]
);

const nn = map(number, x => +x);

const wp0 = combine(many(ws), withPosition(number), (_, x) => x);
const wp = (st: any) => {
    const lineOffsets = st.getData().lineOffsetTable;
    const result = wp0(st);
    const value = result.kind === 'left' ? result.value
                                         : result.value[0];


    const [line, col] = getLineCol(value.position, lineOffsets)!.map(x => x + 1);
    const retval = {
        line, col, value: value.value
    };

    if (result.kind === 'left') {
        return left(retval)
    }

    return right(pair(retval, result.value[1]));
}

test(ll, 'strhello');
test(ll, 'strhello world');
test(nn, '123abc');
test(wp, '\n\n123');
test(wp, '\n\n   hello?');
