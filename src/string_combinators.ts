
import { Parser, left, right, pair } from './parser_combinators'
import {
    ParserStream,
    parseCombine as combine,
    parseCombine3 as combine3,
    parseMany as many,
    parseChoice as genericChoice,
    parseTry as trai,
    parseSatisfy as satisfy
}  from './parser_combinators'

export {
    TextStream, StringParser, StringParserError,

    anyOf, choice, string
}

export type char = string;

interface TextStream extends ParserStream<char> {
    getPosition(this: this): number,
    getLineCol(this: this, pos: number): [number, number]
}

type StringParser<E, T> = Parser<char, TextStream, E, T>

const StaticErrors: { [key in SimpleParserError]: { kind: 'pc_error', code: key } } = {
    digit_expected:         mkSimpleError('digit_expected'),
    whitespace_expected:    mkSimpleError('whitespace_expected'),
    underscore_expected:    mkSimpleError('underscore_expected'),
    ascii_alpha_expected:   mkSimpleError('ascii_alpha_expected'),
    ascii_id_char_expected: mkSimpleError('ascii_id_char_expected'),
};

type StringParserError = typeof StaticErrors[SimpleParserError]
                       | StringMismatch
                       | CharNotExpected

type SimpleParserError = 'digit_expected'
                       | 'whitespace_expected'
                       | 'underscore_expected'
                       | 'ascii_alpha_expected'
                       | 'ascii_id_char_expected'

type StringMismatch    = { kind: 'pc_error', code: 'string_mismatch',   expected: string }
type CharNotExpected   = { kind: 'pc_error', code: 'char_not_expected', expected: string }


export const ws          = charParser(isWhiteSpace,  StaticErrors.whitespace_expected);
export const digit       = charParser(isDigit,       StaticErrors.digit_expected);
export const under       = charParser(isUnder,       StaticErrors.underscore_expected);
export const asciiAlpha  = charParser(isAsciiAlpha,  StaticErrors.ascii_alpha_expected);
export const asciiIdChar = charParser(isAsciiIdChar, StaticErrors.ascii_id_char_expected);

export const char = string;

export const asciiId = combine(
    asciiAlpha,
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

function anyOf(s: char): StringParser<CharNotExpected, char> {
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

function choice<E, T>(map: { [key: string]: StringParser<E, T> }): StringParser<E | StringMismatch, T> {
    const keys = Object.keys(map).sort().reverse();
    return genericChoice(keys.map(k => pair(string(k), map[k])));
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
