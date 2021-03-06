
import { StringCharStream } from '../src/string_char_stream'
import { StringParser, parseLineOffsets } from '../src/string_combinators'

export const __colector = {
    apply: (_x: any) => {
        throw new Error('Not yet implemented');
    }
};

export function test(p: StringParser<any, any>, input: string) {
    const stream = StringCharStream.newInstance(input, { lineOffsetTable: parseLineOffsets(input) });
    const res = p(stream);

    __colector.apply(res);
}
