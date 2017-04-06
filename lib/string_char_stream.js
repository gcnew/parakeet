"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var parser_combinators_1 = require("./parser_combinators");
var StringCharStream = (function () {
    function StringCharStream(source, offset, data) {
        this.source = source;
        this.offset = offset;
        this.data = data;
    }
    StringCharStream.prototype.newInstance = function (source, offset, data) {
        return new StringCharStream(source, offset, data);
    };
    StringCharStream.newInstance = function (source, data) {
        return new StringCharStream(source, 0, data);
    };
    StringCharStream.prototype.getData = function () {
        return this.data;
    };
    StringCharStream.prototype.setData = function (data) {
        return this.newInstance(this.source, this.offset, data);
    };
    StringCharStream.prototype.next = function () {
        if (this.offset >= this.source.length) {
            return null;
        }
        return parser_combinators_1.pair(this.source[this.offset], this.newInstance(this.source, this.offset + 1, this.data));
    };
    StringCharStream.prototype.getPosition = function () {
        return this.offset;
    };
    return StringCharStream;
}());
exports.StringCharStream = StringCharStream;
