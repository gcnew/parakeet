import { StringParser } from './string_combinators';
export { Accessor, cache, byPosAndKey };
declare type Accessor = (data: any, position: number, parser: StringParser<any, any>, value?: any) => any;
declare function cache(accessor: Accessor, leftReplace: boolean): <E, T>(p: StringParser<E, T>) => StringParser<E, T>;
export declare const byPosAndParser: (get: (data: any) => any, set: (data: any, value: any) => void) => Accessor;
declare function byPosAndKey(get: (data: any) => any, set: (data: any, value: any) => any): (key: string) => Accessor;
