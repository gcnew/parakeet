"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function cache(accessor, leftReplace) {
    return function (p) { return function (st) {
        var pos = st.getPosition();
        var data = st.getData();
        var cache = accessor(data, pos, p);
        if (cache && (cache.kind === 'right' || !leftReplace)) {
            return cache;
        }
        var val = p(st);
        accessor(data, pos, p, val);
        return val;
    }; };
}
exports.cache = cache;
function mkMap() {
    var map = Object.create(null);
    map['del me'] = 1;
    delete map['del me'];
    return map;
}
var EMPTY_MAP = mkMap();
function cacheChain(f) {
    return function (get, set) { return function (data, pos, p, val) {
        var cache = get(data) || (val ? mkMap() : EMPTY_MAP);
        var entry = cache[pos];
        if (val === undefined) {
            if (!entry) {
                return undefined;
            }
            var key_1 = f(p, data);
            if (Array.isArray(entry)) {
                for (var _i = 0, entry_1 = entry; _i < entry_1.length; _i++) {
                    var pair = entry_1[_i];
                    if (pair.key === key_1) {
                        return pair.value;
                    }
                }
                return undefined;
            }
            return entry.key === key_1 ? entry.value
                : undefined;
        }
        var key = f(p, data);
        var kv = { key: key, value: val };
        if (!entry) {
            cache[pos] = kv;
            set(data, cache);
            return;
        }
        var arr = Array.isArray(entry) ? entry : [entry];
        for (var _a = 0, arr_1 = arr; _a < arr_1.length; _a++) {
            var pair = arr_1[_a];
            if (pair.key === key) {
                if (pair.value.kind === 'right') {
                    throw new Error('ASSERT: right replacement encountered');
                }
                pair.value = val;
                return;
            }
        }
        arr.push(kv);
        cache[pos] = arr;
        return;
    }; };
}
exports.byPosAndParser = cacheChain(function (x) { return x; });
function byPosAndKey(get, set) {
    return function (key) { return cacheChain(function (_) { return key; })(get, set); };
}
exports.byPosAndKey = byPosAndKey;
