
import { Parser, left, right, pair } from './parser_combinators'
import {
    ParserStream, Either,

    combine, combine3, many, trai, satisfy, genericChoice
}  from './parser_combinators'

export {
    TextStream, StringParser, WithPosition, WithLineCol,

    StringParserError, StringMismatch, CharNotExpected,

    oneOf, choice, string,

    position, withPosition, mapPositionToLineCol
}

export type char = string;

interface TextStream extends ParserStream<char> {
    getPosition(this: this): number,
    getLineCol(this: this, pos: number): [number, number]
}

type StringParser<E, T> = Parser<char, TextStream, E, T>

type WithPosition<T> = { position: number, value: T }
type WithLineCol<T>  = { line: number, col: number, value: T }

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

function oneOf(s: char): StringParser<CharNotExpected, char> {
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

function choice<E, T>(map: { [key: string]: StringParser<E, T> }): StringParser<E | StringMismatch, T> {
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

function positionToLineCol<T>(st: TextStream, n: WithPosition<T>) {
    const lineCol = st.getLineCol(n.position);

    return {
        line: lineCol[0] + 1,
        col:  lineCol[1] + 1,
        value: n.value
    };
}

function mapPositionToLineCol<E, T>(p: StringParser<WithPosition<E>, WithPosition<T>>): StringParser<WithLineCol<E>, WithLineCol<T>> {
    return (st) => {
        const res = p(st);
        if (res.kind === 'left') {
            return left(positionToLineCol(st, res.value));
        }

        return right(pair(positionToLineCol(st, res.value[0]), res.value[1]));
    };
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
