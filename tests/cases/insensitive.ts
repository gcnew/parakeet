
import { test } from '../test_util'

import {
    StringParser, StringMismatch,

    anyChar, string, stringInsensitive
} from '../../src/string_combinators'

import {
    EosReached,

    combine3, withFilter, trai, inspect, pconst, pfail
} from '../../src/parser_combinators'


function insensitive(s: string) {
    return withFilter(x => x.toLowerCase(), string(s.toLowerCase()));
}

function monadicInsensitive(s: string): StringParser<StringMismatch|EosReached, string> {
    if (!s.length) {
        throw new Error('Empty string');
    }

    const errorData: StringMismatch = { kind: 'pc_error', code: 'string_mismatch', expected: s };
    const error = pfail(errorData);

    let acc = '';
    const loop = (i: number): StringParser<StringMismatch|EosReached, string> => {
        return inspect(anyChar, c => {
            if (c.toLowerCase() !== s[i].toLowerCase()) {
                return error;
            }

            acc += c;
            if (s.length - 1 === i) {
                return pconst(acc);
            }

            return loop(i + 1);
        });
    };

    return loop(0);
}

const testNoLeak = combine3(
    insensitive('not a '),
    trai(string('number'), pfail('Filter leak!'), x => x),
    string('Number'),

    (i, _, s) => i + s
);

test(insensitive('Insensitive'), 'InSeNSItiVe');
test(stringInsensitive('Insensitive'), 'InSeNSItiVe');
test(monadicInsensitive('Insensitive'), 'InSeNSItiVe');

test(testNoLeak, 'Not a Number');


