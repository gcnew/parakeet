"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var parser_combinators_1 = require("./parser_combinators");
var parser_combinators_2 = require("./parser_combinators");
exports.ws = charParser(isWhiteSpace, mkSimpleError('whitespace_expected'));
exports.digit = charParser(isDigit, mkSimpleError('digit_expected'));
exports.under = charParser(isUnder, mkSimpleError('underscore_expected'));
exports.asciiAlpha = charParser(isAsciiAlpha, mkSimpleError('ascii_alpha_expected'));
exports.asciiIdChar = charParser(isAsciiIdChar, mkSimpleError('ascii_id_char_expected'));
exports.char = string;
exports.asciiId = parser_combinators_2.combine(parser_combinators_2.alt(exports.under, exports.asciiAlpha), parser_combinators_2.many(exports.asciiIdChar), function (x, xs) { return x + xs.join(''); });
exports.integer = parser_combinators_2.combine(exports.digit, parser_combinators_2.many(exports.digit), function (x, xs) { return x + xs.join(''); });
exports.float = parser_combinators_2.combine3(exports.integer, exports.char('.'), exports.integer, function (i1, _, i2) { return i1 + '.' + i2; });
exports.number = parser_combinators_2.combine(exports.integer, parser_combinators_2.trai(exports.char('.'), exports.integer, function (_, i) { return '.' + i; }), function (w, f) { return w + (f || ''); });
function string(s) {
    if (!s.length) {
        throw new Error('Empty string');
    }
    var errorData = { kind: 'pc_error', code: 'string_mismatch', expected: s };
    var error = parser_combinators_1.left(errorData);
    return function (st) {
        var cur = st;
        for (var i = 0; i < s.length; ++i) {
            var next = cur.next();
            if (!next) {
                return error;
            }
            if (next[0] !== s[i]) {
                return error;
            }
            cur = next[1];
        }
        return parser_combinators_1.right(parser_combinators_1.pair(s, cur));
    };
}
exports.string = string;
function oneOf(s) {
    if (!s.length) {
        throw new Error('Empty string');
    }
    var charMap = {};
    for (var _i = 0, s_1 = s; _i < s_1.length; _i++) {
        var c = s_1[_i];
        charMap[c] = true;
    }
    var errorData = { kind: 'pc_error', code: 'char_not_expected', expected: s };
    var error = parser_combinators_1.left(errorData);
    return function (st) {
        var next = st.next();
        if (!next || !charMap[next[0]]) {
            return error;
        }
        return parser_combinators_1.right(next);
    };
}
exports.oneOf = oneOf;
function stringChoice(map) {
    var keys = Object.keys(map).sort().reverse();
    return parser_combinators_2.genericChoice(keys.map(function (k) { return parser_combinators_1.pair(string(k), map[k]); }));
}
exports.stringChoice = stringChoice;
function position(st) {
    return parser_combinators_1.right(parser_combinators_1.pair(st.getPosition(), st));
}
exports.position = position;
function withPosition(p) {
    return function (st) {
        var res = p(st);
        var position = st.getPosition();
        if (res.kind === 'left') {
            return parser_combinators_1.left({ position: position, value: res.value });
        }
        return parser_combinators_1.right(parser_combinators_1.pair({ position: position, value: res.value[0] }, res.value[1]));
    };
}
exports.withPosition = withPosition;
var invalid_position = { kind: 'pc_error', code: 'invalid_position' };
var left_invalid_position = parser_combinators_1.left(invalid_position);
var pfail_invalid_position = parser_combinators_2.pfail(invalid_position);
function posToLineCol(table) {
    return function (st) {
        var pos = st.getPosition();
        var lineCol = getLineCol(pos, table);
        if (!lineCol) {
            return left_invalid_position;
        }
        return parser_combinators_1.right(parser_combinators_1.pair(lineCol, st));
    };
}
exports.posToLineCol = posToLineCol;
function posToLineCol2(pt) {
    return parser_combinators_2.inspect(parser_combinators_2.combine(pt, position, function (t, p) { return getLineCol(p, t); }), function (lineCol) {
        if (!lineCol) {
            return pfail_invalid_position;
        }
        return parser_combinators_2.pconst(lineCol);
    });
}
exports.posToLineCol2 = posToLineCol2;
function getLineCol(offset, lineOffsetTable) {
    var idx = binarySearch(lineOffsetTable, function (x) { return x[0] < offset ? -1 :
        x[0] > offset ? 1 : 0; });
    if (idx === false) {
        return null;
    }
    if (idx < 0) {
        idx = -idx - 1;
    }
    return [idx, offset - lineOffsetTable[idx][0]];
}
exports.getLineCol = getLineCol;
function parseLineOffsets(source) {
    var lines = source.split('\n');
    var acc = [];
    var offset = 0;
    for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
        var l = lines_1[_i];
        acc.push(parser_combinators_1.pair(offset, l));
        offset += l.length + 1;
    }
    return acc;
}
exports.parseLineOffsets = parseLineOffsets;
function binarySearch(arr, compare) {
    var low = 0;
    var high = arr.length - 1;
    if (!arr.length) {
        return false;
    }
    while (low <= high) {
        var m = low + ((high - low) >> 1);
        var cmp = compare(arr[m]);
        if (cmp < 0) {
            low = m + 1;
            continue;
        }
        if (cmp > 0) {
            high = m - 1;
            continue;
        }
        return m;
    }
    return -low;
}
function isWhiteSpace(s) {
    switch (s) {
        case ' ':
        case '\t':
        case '\n':
        case '\r':
            return true;
        default:
            return false;
    }
}
function isDigit(s) {
    return s >= '0' && s <= '9';
}
function isUnder(s) {
    return s === '_';
}
function isAsciiAlpha(s) {
    return (s >= 'a' && s <= 'z') || (s >= 'A' && s <= 'Z');
}
function isAsciiIdChar(s) {
    return isAsciiAlpha(s) || isUnder(s) || isDigit(s);
}
function mkSimpleError(code) {
    return { kind: 'pc_error', code: code };
}
function charParser(pred, error) {
    return parser_combinators_2.satisfy(pred, error);
}
