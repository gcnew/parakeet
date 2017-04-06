import { TextStream } from './string_combinators';
export { StringCharStream };
declare class StringCharStream implements TextStream {
    private source;
    private offset;
    private data;
    protected constructor(source: string, offset: number, data: any);
    protected newInstance(source: string, offset: number, data: any): this;
    static newInstance(source: string, data?: any): StringCharStream;
    getData(): any;
    setData(data: any): this;
    next(): [string, this] | null;
    getPosition(): number;
}
