
import { pair } from './parser_combinators'
import { TextStream } from './string_combinators'

export { CharStream }


class CharStream implements TextStream {
    constructor(
        private source: string,
        private offset: number
    ) {
    }

    protected newInstance(source: string, offset: number): this {
        return new CharStream(source, offset) as this;
    }

    next() {
        if (this.offset >= this.source.length) {
            return null;
        }

        return pair(
            this.source[this.offset],
            this.newInstance(this.source, this.offset + 1)
        );
    }

    getPosition() {
        return this.offset;
    }

    getLineCol(offset: number) {
        // TODO: ...
        return null as any;
    }
}
