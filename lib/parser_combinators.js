"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function left(value) {
    return { kind: 'left', value: value };
}
exports.left = left;
function right(value) {
    return { kind: 'right', value: value };
}
exports.right = right;
function pair(fst, snd) {
    return [fst, snd];
}
exports.pair = pair;
function map(p, f) {
    return function (st) {
        var res = p(st);
        if (res.kind === 'left') {
            return res;
        }
        return right(pair(f(res.value[0]), res.value[1]));
    };
}
exports.map = map;
function mapError(p, f) {
    return function (st) {
        var res = p(st);
        if (res.kind === 'left') {
            return left(f(res.value));
        }
        return res;
    };
}
exports.mapError = mapError;
var eosReached = left({ kind: 'pc_error', code: 'eos_reached' });
function any(st) {
    var val = st.next();
    if (!val) {
        return eosReached;
    }
    return right(val);
}
exports.any = any;
var eosExpected = left({ kind: 'pc_error', code: 'eos_expected' });
function eos(st) {
    if (st.next()) {
        return eosExpected;
    }
    return right(pair(undefined, st));
}
exports.eos = eos;
function terminated(p) {
    return combine(p, eos, function (x) { return x; });
}
exports.terminated = terminated;
function pconst(x) {
    return function (st) {
        return right(pair(x, st));
    };
}
exports.pconst = pconst;
function pfail(e) {
    var error = left(e);
    return function (_) {
        return error;
    };
}
exports.pfail = pfail;
function not(p) {
    return function (st) {
        var res = p(st);
        if (res.kind === 'left') {
            return right(pair(res.value, st));
        }
        return left(res.value[0]);
    };
}
exports.not = not;
function getData(st) {
    return right(pair(st.getData(), st));
}
exports.getData = getData;
function setData(data) {
    return function (st) {
        return right(pair(undefined, st.setData(data)));
    };
}
exports.setData = setData;
function modifyData(f) {
    return function (st) {
        var newData = f(st.getData());
        return right(pair(newData, st.setData(newData)));
    };
}
exports.modifyData = modifyData;
function genericAlt(parsers) {
    if (!parsers.length) {
        throw new Error('No parsers provided');
    }
    if (!parsers.every(function (x) { return typeof x === 'function'; })) {
        throw new Error('Empty parser!');
    }
    return function (st) {
        var err;
        for (var _i = 0, parsers_1 = parsers; _i < parsers_1.length; _i++) {
            var p = parsers_1[_i];
            var res = p(st);
            if (res.kind !== 'left') {
                return res;
            }
            err = res;
        }
        return err;
    };
}
exports.genericAlt = genericAlt;
function genericCombine(parsers, f) {
    if (!parsers.length) {
        throw new Error('No parsers provided');
    }
    if (!parsers.every(function (x) { return typeof x === 'function'; })) {
        throw new Error('Empty parser!');
    }
    return function (st) {
        var cur = st;
        var results = [];
        for (var _i = 0, parsers_2 = parsers; _i < parsers_2.length; _i++) {
            var p = parsers_2[_i];
            var res = p(cur);
            if (res.kind === 'left') {
                return res;
            }
            cur = res.value[1];
            results.push(res.value[0]);
        }
        return right(pair(f.apply(void 0, results), cur));
    };
}
exports.genericCombine = genericCombine;
function many(p) {
    return function (st) {
        var cur = st;
        var results = [];
        while (true) {
            var res = p(cur);
            if (res.kind === 'left') {
                break;
            }
            cur = res.value[1];
            results.push(res.value[0]);
        }
        return right(pair(results, cur));
    };
}
exports.many = many;
function pwhile(cond, body) {
    return function (st) {
        var cur = st;
        var results = [];
        while (true) {
            var temp = cond(cur);
            if (temp.kind !== 'right') {
                break;
            }
            var res = body(temp.value[1]);
            if (res.kind === 'left') {
                return res;
            }
            cur = res.value[1];
            results.push(res.value[0]);
        }
        return right(pair(results, cur));
    };
}
exports.pwhile = pwhile;
function oneOrMore(p) {
    return combine(p, many(p), function (x, xs) { return (xs.unshift(x), xs); });
}
exports.oneOrMore = oneOrMore;
function separated(p, sep) {
    return combine(p, pwhile(sep, p), function (x, xs) { return (xs.unshift(x), xs); });
}
exports.separated = separated;
function separatedZero(p, sep) {
    return map(trai(p, pwhile(sep, p), function (x, xs) { return (xs.unshift(x), xs); }), function (res) { return res || []; });
}
exports.separatedZero = separatedZero;
function peek(p1) {
    return function (st) {
        var res = p1(st);
        if (res.kind === 'left') {
            return res;
        }
        return right(pair(res.value[0], st));
    };
}
exports.peek = peek;
function maybe(p1) {
    return function (st) {
        var res = p1(st);
        if (res.kind === 'left') {
            return right(pair(undefined, st));
        }
        return res;
    };
}
exports.maybe = maybe;
function trai(p1, p2, f) {
    return function (st) {
        var res = p1(st);
        if (res.kind === 'left') {
            return right(pair(undefined, st));
        }
        var res2 = p2(res.value[1]);
        if (res2.kind === 'left') {
            return res2;
        }
        return right(pair(f(res.value[0], res2.value[0]), res2.value[1]));
    };
}
exports.trai = trai;
function recover(p1, f) {
    return function (st) {
        var res = p1(st);
        if (res.kind === 'right') {
            return res;
        }
        return f(res.value)(st);
    };
}
exports.recover = recover;
function inspect(p1, f) {
    return function (st) {
        var res = p1(st);
        if (res.kind === 'left') {
            return res;
        }
        return f(res.value[0])(res.value[1]);
    };
}
exports.inspect = inspect;
function satisfy(f, e) {
    var error = left(e);
    return function (st) {
        var res = st.next();
        if (!res) {
            return eosReached;
        }
        if (!f(res[0])) {
            return error;
        }
        return right(res);
    };
}
exports.satisfy = satisfy;
function genericChoice(parsers) {
    if (!parsers.length) {
        throw new Error('No parsers provided');
    }
    if (!parsers.every(function (x) { return typeof x[0] === 'function' && typeof x[1] === 'function'; })) {
        throw new Error('Empty parser!');
    }
    return function (st) {
        var ret;
        for (var _i = 0, parsers_3 = parsers; _i < parsers_3.length; _i++) {
            var pair_1 = parsers_3[_i];
            var res = pair_1[0](st);
            if (res.kind === 'right') {
                return pair_1[1](res.value[1]);
            }
            ret = res;
        }
        return ret;
    };
}
exports.genericChoice = genericChoice;
function alt(p1, p2) {
    return genericAlt([p1, p2]);
}
exports.alt = alt;
function alt3(p1, p2, p3) {
    return genericAlt([p1, p2, p3]);
}
exports.alt3 = alt3;
function alt4(p1, p2, p3, p4) {
    return genericAlt([p1, p2, p3, p4]);
}
exports.alt4 = alt4;
function alt5(p1, p2, p3, p4, p5) {
    return genericAlt([p1, p2, p3, p4, p5]);
}
exports.alt5 = alt5;
function alt6(p1, p2, p3, p4, p5, p6) {
    return genericAlt([p1, p2, p3, p4, p5, p6]);
}
exports.alt6 = alt6;
function alt7(p1, p2, p3, p4, p5, p6, p7) {
    return genericAlt([p1, p2, p3, p4, p5, p6, p7]);
}
exports.alt7 = alt7;
function alt8(p1, p2, p3, p4, p5, p6, p7, p8) {
    return genericAlt([p1, p2, p3, p4, p5, p6, p7, p8]);
}
exports.alt8 = alt8;
function combine(p1, p2, f) {
    return genericCombine([p1, p2], f);
}
exports.combine = combine;
function combine3(p1, p2, p3, f) {
    return genericCombine([p1, p2, p3], f);
}
exports.combine3 = combine3;
function combine4(p1, p2, p3, p4, f) {
    return genericCombine([p1, p2, p3, p4], f);
}
exports.combine4 = combine4;
function combine5(p1, p2, p3, p4, p5, f) {
    return genericCombine([p1, p2, p3, p4, p5], f);
}
exports.combine5 = combine5;
function combine6(p1, p2, p3, p4, p5, p6, f) {
    return genericCombine([p1, p2, p3, p4, p5, p6], f);
}
exports.combine6 = combine6;
function combine7(p1, p2, p3, p4, p5, p6, p7, f) {
    return genericCombine([p1, p2, p3, p4, p5, p6, p7], f);
}
exports.combine7 = combine7;
function combine8(p1, p2, p3, p4, p5, p6, p7, p8, f) {
    return genericCombine([p1, p2, p3, p4, p5, p6, p7, p8], f);
}
exports.combine8 = combine8;
function choice(p1, p2) {
    return genericChoice([p1, p2]);
}
exports.choice = choice;
function choice3(p1, p2, p3) {
    return genericChoice([p1, p2, p3]);
}
exports.choice3 = choice3;
function choice4(p1, p2, p3, p4) {
    return genericChoice([p1, p2, p3, p4]);
}
exports.choice4 = choice4;
function choice5(p1, p2, p3, p4, p5) {
    return genericChoice([p1, p2, p3, p4, p5]);
}
exports.choice5 = choice5;
function choice6(p1, p2, p3, p4, p5, p6) {
    return genericChoice([p1, p2, p3, p4, p5, p6]);
}
exports.choice6 = choice6;
function choice7(p1, p2, p3, p4, p5, p6, p7) {
    return genericChoice([p1, p2, p3, p4, p5, p6, p7]);
}
exports.choice7 = choice7;
function choice8(p1, p2, p3, p4, p5, p6, p7, p8) {
    return genericChoice([p1, p2, p3, p4, p5, p6, p7, p8]);
}
exports.choice8 = choice8;
