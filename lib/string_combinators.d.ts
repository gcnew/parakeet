import { Parser } from './parser_combinators';
import { ParserStream, Either } from './parser_combinators';
export { TextStream, StringParser, LineOffsetTable, WithPosition, WithLineCol, StringParserError, DigitExpected, WhitespaceExpected, UnderscoreExpected, AsciiAlphaExpected, AsciiIdCharExpected, StringMismatch, CharNotExpected, InvalidPosition, oneOf, stringChoice, string, token, position, withPosition, posToLineCol, posToLineCol2, parseLineOffsets, getLineCol };
export declare type char = string;
interface TextStream extends ParserStream<char> {
    getPosition(this: this): number;
}
declare type StringParser<E, T> = Parser<char, TextStream, E, T>;
declare type LineOffsetTable = [number, string][];
declare type WithPosition<T> = {
    position: number;
    value: T;
};
declare type WithLineCol<T> = {
    line: number;
    col: number;
    value: T;
};
declare type DigitExpected = {
    kind: 'pc_error';
    code: 'digit_expected';
};
declare type WhitespaceExpected = {
    kind: 'pc_error';
    code: 'whitespace_expected';
};
declare type UnderscoreExpected = {
    kind: 'pc_error';
    code: 'underscore_expected';
};
declare type AsciiAlphaExpected = {
    kind: 'pc_error';
    code: 'ascii_alpha_expected';
};
declare type AsciiIdCharExpected = {
    kind: 'pc_error';
    code: 'ascii_id_char_expected';
};
declare type StringParserError = DigitExpected | WhitespaceExpected | UnderscoreExpected | AsciiAlphaExpected | AsciiIdCharExpected | StringMismatch | CharNotExpected;
declare type StringMismatch = {
    kind: 'pc_error';
    code: 'string_mismatch';
    expected: string;
};
declare type CharNotExpected = {
    kind: 'pc_error';
    code: 'char_not_expected';
    expected: string;
};
declare type InvalidPosition = {
    kind: 'pc_error';
    code: 'invalid_position';
};
export declare const ws: Parser<string, TextStream, {
    kind: "pc_error";
    code: "whitespace_expected";
}, string>;
export declare const digit: Parser<string, TextStream, {
    kind: "pc_error";
    code: "digit_expected";
}, string>;
export declare const under: Parser<string, TextStream, {
    kind: "pc_error";
    code: "underscore_expected";
}, string>;
export declare const asciiAlpha: Parser<string, TextStream, {
    kind: "pc_error";
    code: "ascii_alpha_expected";
}, string>;
export declare const asciiIdChar: Parser<string, TextStream, {
    kind: "pc_error";
    code: "ascii_id_char_expected";
}, string>;
export declare const char: typeof string;
export declare const asciiId: Parser<string, TextStream, {
    kind: "pc_error";
    code: "ascii_alpha_expected";
}, string>;
export declare const integer: Parser<string, TextStream, {
    kind: "pc_error";
    code: "digit_expected";
}, string>;
export declare const float: Parser<string, TextStream, StringMismatch | {
    kind: "pc_error";
    code: "digit_expected";
}, string>;
export declare const number: Parser<string, TextStream, {
    kind: "pc_error";
    code: "digit_expected";
}, string>;
declare function string<S extends string>(s: S): StringParser<StringMismatch, S>;
declare function oneOf(s: string): StringParser<CharNotExpected, char>;
declare function stringChoice<E, T>(map: {
    [key: string]: StringParser<E, T>;
}): StringParser<E | StringMismatch, T>;
declare function token<E, TE, T, TT>(p: StringParser<E, T>, f: (val: T, start: number, end: number) => TT, errorMapper: (e: E, pos: number) => TE): StringParser<TE, TT>;
declare function position<S extends TextStream>(st: S): Either<never, [number, S]>;
declare function withPosition<E, T>(p: StringParser<E, T>): StringParser<WithPosition<E>, WithPosition<T>>;
declare function posToLineCol(table: LineOffsetTable): <S extends TextStream>(st: S) => Either<InvalidPosition, [[number, number], S]>;
declare function posToLineCol2<E>(pt: StringParser<E, LineOffsetTable>): StringParser<E | InvalidPosition, [number, number]>;
declare function getLineCol(offset: number, lineOffsetTable: LineOffsetTable): [number, number] | null;
declare function parseLineOffsets(source: string): LineOffsetTable;
