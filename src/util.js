// A bunch of helper functions.
"use strict";
function isUpperCase(char) {
    return char.toUpperCase() === char;
}
exports.isUpperCase = isUpperCase;
function isFunction(value) {
    return typeof value === 'function';
}
exports.isFunction = isFunction;
function isObject(value) {
    return typeof value === 'object';
}
exports.isObject = isObject;
function toString(token) {
    if (typeof token === 'string') {
        return token;
    }
    if (token === undefined || token === null) {
        return '' + token;
    }
    if (token.name) {
        return token.name;
    }
    return token.toString();
}
exports.toString = toString;
var ownKeys = (this
    && this.Reflect
    && Reflect.ownKeys ? Reflect.ownKeys : function ownKeys(O) {
    var keys = Object.getOwnPropertyNames(O);
    if (Object.getOwnPropertySymbols)
        return keys.concat(Object.getOwnPropertySymbols(O).toString());
    return keys;
});
exports.ownKeys = ownKeys;
