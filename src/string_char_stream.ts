
import { pair } from './parser_combinators'
import { TextStream } from './string_combinators'

export { StringCharStream }

type LineOffsetTable = [number, string][];

class StringCharStream implements TextStream {
    protected constructor(
        private source: string,
        private offset: number,
        private lineOffsetTable: [number, string][]
    ) {
    }

    protected newInstance(source: string, offset: number, lineOffsetTable: [number, string][]): this {
        return new StringCharStream(source, offset, lineOffsetTable) as this;
    }

    public static newInstance(source: string) {
        return new StringCharStream(source, 0, parseLineOffsets(source));
    }

    next() {
        if (this.offset >= this.source.length) {
            return null;
        }

        return pair(
            this.source[this.offset],
            this.newInstance(this.source, this.offset + 1, this.lineOffsetTable)
        );
    }

    getPosition() {
        return this.offset;
    }

    getLineCol(offset: number): [number, number] {
        const res = getLineCol(offset, this.lineOffsetTable);

        if (!res) {
            throw new Error(`Invalid offset: ${offset}`);
        }

        return res;
    }
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
