
import { test } from '../test_util'

import * as C from '../../src/cache'

import {
    StringParser,

    char, string
} from '../../src/string_combinators'

import {
    map, alt3, combine, combine3, getData, pair
} from '../../src/parser_combinators'


const cache1 = C.cache(
    C.byPosAndParser(
        data => data.cache,
        (data, cache) => data.cache = cache
    ),
    false
);

const cache2 = (key: string, replace: boolean) => C.cache(
    C.byPosAndKey(
        data => data.cache,
        (data, cache) => data.cache = cache
    )(key),
    replace
);


function mkParser(cache: typeof cache1) {
    const x = cache(combine(char('x'), getData, (x, d) => (d.counter++, x)));

    const xn = alt3(
        string('pasta'),
        combine3(x, x, cache(char('y')), (a, b, y) => a + b + y),
        combine3(x, x, x,                (a, b, c) => a + b + c)
    );

    return combine(
        map(getData, d => d.counter = 0) as StringParser<never, 0>,
        combine(xn, getData, (r, d) => pair(r, d.counter)),

        (_, x) => x
    );
}

test(mkParser(cache1), 'xxx');
test(mkParser(cache2('eks', true)), 'xxx');

// Failure expected as the fail of `char('y')` is persisted and returned
test(mkParser(cache2('eks', false)), 'xxx');
