
import { pair } from './parser_combinators'
import { TextStream } from './string_combinators'

export { StringCharStream }


class StringCharStream implements TextStream {
    protected constructor(
        private source: string,
        private offset: number,
        private data: any
    ) {
    }

    protected newInstance(source: string, offset: number, data: any): this {
        return new StringCharStream(source, offset, data) as this;
    }

    public static newInstance(source: string, data?: any) {
        return new StringCharStream(source, 0, data);
    }

    getData() {
        return this.data;
    }

    setData(data: any) {
        return this.newInstance(this.source, this.offset, data);
    }

    next() {
        if (this.offset >= this.source.length) {
            return null;
        }

        return pair(
            this.source[this.offset],
            this.newInstance(this.source, this.offset + 1, this.data)
        );
    }

    getPosition() {
        return this.offset;
    }
}
