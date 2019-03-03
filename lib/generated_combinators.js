"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
        for (var _i = 0, parsers_1 = parsers; _i < parsers_1.length; _i++) {
            var p = parsers_1[_i];
            var res = p(cur);
            if (res.kind === 'left') {
                return res;
            }
            cur = res.value[1];
            results.push(res.value[0]);
        }
        return { kind: 'right', value: [f.apply(void 0, results), cur] };
    };
}
exports.genericCombine = genericCombine;
function genericAlt(parsers) {
    if (!parsers.length) {
        throw new Error('No parsers provided');
    }
    if (!parsers.every(function (x) { return typeof x === 'function'; })) {
        throw new Error('Empty parser!');
    }
    return function (st) {
        var err = undefined;
        for (var _i = 0, parsers_2 = parsers; _i < parsers_2.length; _i++) {
            var p = parsers_2[_i];
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
function genericChoice(parsers) {
    if (!parsers.length) {
        throw new Error('No parsers provided');
    }
    if (!parsers.every(function (x) { return typeof x[0] === 'function' && typeof x[1] === 'function'; })) {
        throw new Error('Empty parser!');
    }
    return function (st) {
        var ret = undefined;
        for (var _i = 0, parsers_3 = parsers; _i < parsers_3.length; _i++) {
            var pair = parsers_3[_i];
            var res = pair[0](st);
            if (res.kind === 'right') {
                return pair[1](res.value[1]);
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
