"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
var generated_combinators_1 = require("./generated_combinators");
__export(require("./generated_combinators"));
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
function _1(x) {
    return x;
}
exports._1 = _1;
function _2(_, x) {
    return x;
}
exports._2 = _2;
function _3(_1, _2, x) {
    return x;
}
exports._3 = _3;
function _4(_1, _2, _3, x) {
    return x;
}
exports._4 = _4;
function tagged(tag, value) {
    return { tag: tag, value: value };
}
exports.tagged = tagged;
function mkFilterStream(filter, st) {
    var wrapped = Object.create(st);
    wrapped.next = function () {
        var val = st.next();
        if (!val) {
            return val;
        }
        return [filter(val[0]), mkFilterStream(filter, val[1])];
    };
    return wrapped;
}
function unwrapFilterStream(st) {
    var wrapped = Object.getPrototypeOf(st);
    if (!wrapped.next) {
        throw new Error('Assert: Unwrapping failed');
    }
    return wrapped;
}
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
function withFilter(filter, p) {
    return function (st) {
        var res = p(mkFilterStream(filter, st));
        if (res.kind === 'left') {
            return res;
        }
        return right(pair(res.value[0], unwrapFilterStream(res.value[1])));
    };
}
exports.withFilter = withFilter;
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
    return generated_combinators_1.combine(p, eos, function (x) { return x; });
}
exports.terminated = terminated;
function forward(f) {
    return function (st) { return f()(st); };
}
exports.forward = forward;
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
    return generated_combinators_1.combine(p, many(p), function (x, xs) { return (xs.unshift(x), xs); });
}
exports.oneOrMore = oneOrMore;
function separated(p, sep) {
    return generated_combinators_1.combine(p, pwhile(sep, p), function (x, xs) { return (xs.unshift(x), xs); });
}
exports.separated = separated;
function separatedZero(p, sep) {
    return map(trai(p, pwhile(sep, p), function (x, xs) { return (xs.unshift(x), xs); }), function (res) { return res || []; });
}
exports.separatedZero = separatedZero;
function separatedTrailing(p, sep) {
    return generated_combinators_1.combine(p, trai(sep, separatedZeroTrailing(p, sep), _2), function (x, xs) { return xs ? (xs.unshift(x), xs) : [x]; });
}
exports.separatedTrailing = separatedTrailing;
function separatedZeroTrailing(p, sep) {
    return generated_combinators_1.combine(many(generated_combinators_1.combine(p, sep, _1)), maybe(p), function (xs, x) { return (x && xs.push(x), xs); });
}
exports.separatedZeroTrailing = separatedZeroTrailing;
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
