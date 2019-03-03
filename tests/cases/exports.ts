
import { test } from '../test_util'

import { many, combine3, anyChar, ws, number } from '../../src'

const p = combine3(
    anyChar,
    many(ws),
    number,

    (chr, _, num) => ({ chr, num: Number(num) })
);

test(p, "s 10");
