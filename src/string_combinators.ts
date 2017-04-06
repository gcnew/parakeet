
import { Parser, left, right, pair } from './parser_combinators'
import {
    ParserStream, Either,

    combine, combine3, alt, many, trai, satisfy, inspect, pfail, pconst, genericChoice
}  from './parser_combinators'

export {
    TextStream, StringParser, LineOffsetTable, WithPosition, WithLineCol,

    StringParserError, DigitExpected, WhitespaceExpected, UnderscoreExpected,
    AsciiAlphaExpected, AsciiIdCharExpected, StringMismatch, CharNotExpected,
    InvalidPosition,

    oneOf, stringChoice, string,

    position, withPosition, posToLineCol, posToLineCol2,

    parseLineOffsets, getLineCol
}

export type char = string;

interface TextStream extends ParserStream<char> {
    getPosition(this: this): number
}

type StringParser<E, T> = Parser<char, TextStream, E, T>

type LineOffsetTable = [number, string][];

type WithPosition<T> = { position: number, value: T }
type WithLineCol<T>  = { line: number, col: number, value: T }

type DigitExpected       = { kind: 'pc_error', code: 'digit_expected'         }
type WhitespaceExpected  = { kind: 'pc_error', code: 'whitespace_expected'    }
type UnderscoreExpected  = { kind: 'pc_error', code: 'underscore_expected'    }
type AsciiAlphaExpected  = { kind: 'pc_error', code: 'ascii_alpha_expected'   }
type AsciiIdCharExpected = { kind: 'pc_error', code: 'ascii_id_char_expected' }

type StringParserError = DigitExpected
                       | WhitespaceExpected
                       | UnderscoreExpected
                       | AsciiAlphaExpected
                       | AsciiIdCharExpected
                       | StringMismatch
                       | CharNotExpected

type StringMismatch    = { kind: 'pc_error', code: 'string_mismatch',   expected: string }
type CharNotExpected   = { kind: 'pc_error', code: 'char_not_expected', expected: string }
type InvalidPosition   = { kind: 'pc_error', code: 'invalid_position'                    }


export const ws          = charParser(isWhiteSpace,  mkSimpleError('whitespace_expected'));
export const digit       = charParser(isDigit,       mkSimpleError('digit_expected'));
export const under       = charParser(isUnder,       mkSimpleError('underscore_expected'));
export const asciiAlpha  = charParser(isAsciiAlpha,  mkSimpleError('ascii_alpha_expected'));
export const asciiIdChar = charParser(isAsciiIdChar, mkSimpleError('ascii_id_char_expected'));

export const char = string;

export const asciiId = combine(
    alt(under, asciiAlpha),
    many(asciiIdChar),
    (x, xs) => x + xs.join('')
);

export const integer = combine(
    digit,
    many(digit),
    (x, xs) => x + xs.join('')
);

export const float = combine3(
    integer,
    char('.'),
    integer,
    (i1, _, i2) => i1 + '.' + i2
);

export const number = combine(
    integer,
    trai(char('.'), integer, (_, i) => '.' + i),
    (w, f) => w + (f || '')
);

function string<S extends string>(s: S): StringParser<StringMismatch, S> {
    if (!s.length) {
        throw new Error('Empty string');
    }

    const errorData: StringMismatch = { kind: 'pc_error', code: 'string_mismatch', expected: s };
    const error = left(errorData);

    return (st) => {
        let cur = st;

        for (let i = 0; i < s.length; ++i) {
            const next = cur.next();

            if (!next) {
                return error;
            }

            if (next[0] !== s[i]) {
                return error;
            }

            cur = next[1];
        }

        return right(pair(s, cur));
    };
}

function oneOf(s: string): StringParser<CharNotExpected, char> {
    if (!s.length) {
        throw new Error('Empty string');
    }

    const charMap: { [key: string]: boolean } = {};
    for (let c of s) {
        charMap[c] = true;
    }

    const errorData: CharNotExpected = { kind: 'pc_error', code: 'char_not_expected', expected: s };
    const error = left(errorData);

    return (st) => {
        const next = st.next();

        if (!next || !charMap[next[0]]) {
            return error;
        }

        return right(next);
    };
}

// TODO: one day
// function choice<T, M extends { [key: string]: StringParser<any, T> }>(map: M): StringParser<ErrorOf<M[keyof M]> | StringMismatch, T> {

function stringChoice<E, T>(map: { [key: string]: StringParser<E, T> }): StringParser<E | StringMismatch, T> {
    const keys = Object.keys(map).sort().reverse();
    return genericChoice(keys.map(k => pair(string(k), map[k])));
}

function position<S extends TextStream>(st: S): Either<never, [number, S]> {
    return right(pair(st.getPosition(), st));
}

function withPosition<E, T>(p: StringParser<E, T>): StringParser<WithPosition<E>, WithPosition<T>> {
    return (st) => {
        const res = p(st);
        const position = st.getPosition();

        if (res.kind === 'left') {
            return left({ position, value: res.value });
        }

        return right(pair({ position, value: res.value[0] }, res.value[1]));
    };
}

const invalid_position: InvalidPosition = { kind: 'pc_error', code: 'invalid_position' };
const left_invalid_position  = left(invalid_position);
const pfail_invalid_position = pfail(invalid_position);

function posToLineCol(table: LineOffsetTable) {
    return <S extends TextStream>(st: S): Either<InvalidPosition, [[number, number], S]> => {
        const pos = st.getPosition();
        const lineCol = getLineCol(pos, table);

        if (!lineCol) {
            return left_invalid_position;
        }

        return right(pair(lineCol, st));
    };
}

function posToLineCol2<E>(pt: StringParser<E, LineOffsetTable>): StringParser<E | InvalidPosition, [number, number]> {
    return inspect(
        combine(pt, position, (t, p) => getLineCol(p, t)),

        lineCol => {
            if (!lineCol) {
                return pfail_invalid_position;
            }

            return pconst(lineCol);
        }
    );
}

function getLineCol(offset: number, lineOffsetTable: LineOffsetTable): [number, number]|null {
    let idx = binarySearch(lineOffsetTable, x => x[0] < offset ? -1 :
                                                 x[0] > offset ?  1 : 0);

    if (idx === false) {
        return null;
    }

    if (idx < 0) {
        idx = -idx - 1;
    }

    return [idx, offset - lineOffsetTable[idx][0]];
}

function parseLineOffsets(source: string): LineOffsetTable {
    const lines = source.split('\n');

    let acc = [];
    let offset = 0;
    for (const l of lines) {
        acc.push(pair(offset, l));
        offset += l.length + 1;
    }

    return acc;
}

function binarySearch<T>(arr: T[], compare: (x: T) => -1|0|1): false|number {
    let low = 0;
    let high = arr.length - 1;

    if (!arr.length) {
        return false;
    }

    while (low <= high) {
        const m = low + ((high - low) >> 1);
        const cmp = compare(arr[m]);

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

function isWhiteSpace(s: char) {
    switch (s) {
        case ' ': case '\t': case '\n': case '\r':
            return true;
        default:
            return false;
    }
}

function isDigit(s: char) {
    return s >= '0' && s <= '9';
}

function isUnder(s: char) {
    return s === '_';
}

function isAsciiAlpha(s: char) {
    return (s >= 'a' && s <= 'z') || (s >= 'A' && s <= 'Z');
}

function isAsciiIdChar(s: char) {
    return isAsciiAlpha(s) || isUnder(s) || isDigit(s);
}

function mkSimpleError<T extends string>(code: T) {
    return { kind: 'pc_error' as 'pc_error', code };
}

function charParser<E extends StringParserError>(pred: (x: char) => boolean, error: E): StringParser<E, char> {
    return satisfy<char, TextStream, E>(pred, error);
}
