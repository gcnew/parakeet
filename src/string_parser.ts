
import { ParserStream, pair } from './parser_combinators'

export { CharStream }


class CharStream implements ParserStream<string> {
    constructor(
        private source: string,
        private offset: number
    ) {
    }

    next() {
        if (this.offset >= this.source.length) {
            return null;
        }

        return pair(this.source[this.offset], new CharStream(this.source, this.offset + 1));
    }
}
