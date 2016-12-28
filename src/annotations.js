"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var util_1 = require("./util");
// ANNOTATIONS
/**
* A built-in token.
* Used to ask for pre-injected parent constructor.
* A class constructor can ask for this.
*/
var SuperConstructor = (function () {
    function SuperConstructor() {
    }
    return SuperConstructor;
}());
exports.SuperConstructor = SuperConstructor;
/**
* A built-in scope.
* Never cache.
*/
var TransientScope = (function () {
    function TransientScope() {
    }
    return TransientScope;
}());
exports.TransientScope = TransientScope;
var InjectDecorator = (function () {
    function InjectDecorator() {
        var tokens = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            tokens[_i] = arguments[_i];
        }
        this.tokens = tokens;
        this.isPromise = false;
        this.isLazy = false;
    }
    return InjectDecorator;
}());
exports.InjectDecorator = InjectDecorator;
var InjectPromiseDecorator = (function (_super) {
    __extends(InjectPromiseDecorator, _super);
    function InjectPromiseDecorator() {
        var tokens = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            tokens[_i] = arguments[_i];
        }
        var _this = _super.call(this) || this;
        _this.tokens = tokens;
        _this.isPromise = true;
        _this.isLazy = false;
        return _this;
    }
    return InjectPromiseDecorator;
}(InjectDecorator));
exports.InjectPromiseDecorator = InjectPromiseDecorator;
var InjectLazyDecorator = (function (_super) {
    __extends(InjectLazyDecorator, _super);
    function InjectLazyDecorator() {
        var tokens = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            tokens[_i] = arguments[_i];
        }
        var _this = _super.call(this) || this;
        _this.tokens = tokens;
        _this.isPromise = false;
        _this.isLazy = true;
        return _this;
    }
    return InjectLazyDecorator;
}(InjectDecorator));
exports.InjectLazyDecorator = InjectLazyDecorator;
var ProvideDecorator = (function () {
    function ProvideDecorator(token) {
        this.token = token;
        this.isPromise = false;
    }
    return ProvideDecorator;
}());
exports.ProvideDecorator = ProvideDecorator;
var ProvidePromiseDecorator = (function (_super) {
    __extends(ProvidePromiseDecorator, _super);
    function ProvidePromiseDecorator(token) {
        var _this = _super.call(this, token) || this;
        _this.token = token;
        _this.isPromise = true;
        return _this;
    }
    return ProvidePromiseDecorator;
}(ProvideDecorator));
exports.ProvidePromiseDecorator = ProvidePromiseDecorator;
var ClassProvider = (function () {
    function ClassProvider() {
    }
    return ClassProvider;
}());
exports.ClassProvider = ClassProvider;
var FactoryProvider = (function () {
    function FactoryProvider() {
    }
    return FactoryProvider;
}());
exports.FactoryProvider = FactoryProvider;
/**
 * Append annotation on a function or class.
 * This can be helpful when not using ES6+.
 */
function annotate(fn, annotation) {
    fn.annotations = fn.annotations || [];
    fn.annotations.push(annotation);
}
exports.annotate = annotate;
/**
 * Read annotations on a function or class and return whether given annotation is present.
 */
function hasAnnotation(fn, annotationClass) {
    if (!fn.annotations || fn.annotations.length === 0) {
        return false;
    }
    for (var _i = 0, _a = fn.annotations; _i < _a.length; _i++) {
        var annotation = _a[_i];
        if (annotation instanceof annotationClass) {
            return true;
        }
    }
    return false;
}
exports.hasAnnotation = hasAnnotation;
/**
 * Read annotations on a function or class and collect "interesting" metadata.
 */
function readAnnotations(fn) {
    var collectedAnnotations = {
        /**
         * Description of the provided value.
         */
        provide: {
            token: null,
            isPromise: false
        },
        /**
         * List of parameter descriptions.
         * A parameter description is an object with properties:
         * - token (anything)
         * - isPromise (boolean)
         * - isLazy (boolean)
         */
        params: []
    };
    if (fn && (typeof fn.annotations === 'object')) {
        var _loop_1 = function (annotation) {
            if (annotation instanceof InjectDecorator) {
                annotation.tokens.forEach(function (token) {
                    collectedAnnotations.params.push({
                        token: token,
                        isPromise: annotation.isPromise,
                        isLazy: annotation.isLazy
                    });
                });
            }
            if (annotation instanceof ProvideDecorator) {
                collectedAnnotations.provide.token = annotation.token;
                collectedAnnotations.provide.isPromise = annotation.isPromise;
            }
        };
        for (var _i = 0, _a = fn.annotations; _i < _a.length; _i++) {
            var annotation = _a[_i];
            _loop_1(annotation);
        }
    }
    // Read annotations for individual parameters.
    if (fn.parameters) {
        fn.parameters.forEach(function (param, idx) {
            for (var _i = 0, param_1 = param; _i < param_1.length; _i++) {
                var paramAnnotation = param_1[_i];
                // Type annotation.
                if (util_1.isFunction(paramAnnotation) && !collectedAnnotations.params[idx]) {
                    collectedAnnotations.params[idx] =
                        {
                            token: paramAnnotation,
                            isPromise: false,
                            isLazy: false
                        };
                }
                else if (paramAnnotation instanceof InjectDecorator) {
                    collectedAnnotations.params[idx] =
                        {
                            token: paramAnnotation.tokens[0],
                            isPromise: paramAnnotation.isPromise,
                            isLazy: paramAnnotation.isLazy
                        };
                }
            }
        });
    }
    return collectedAnnotations;
}
exports.readAnnotations = readAnnotations;
/**
 * Decorator versions of annotation classes
 */
function Inject() {
    var tokens = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        tokens[_i] = arguments[_i];
    }
    return function (fn) {
        annotate(fn, new (InjectDecorator.bind.apply(InjectDecorator, [void 0].concat(tokens)))());
    };
}
exports.Inject = Inject;
function InjectPromise() {
    var tokens = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        tokens[_i] = arguments[_i];
    }
    return function (fn) {
        annotate(fn, new (InjectPromiseDecorator.bind.apply(InjectPromiseDecorator, [void 0].concat(tokens)))());
    };
}
exports.InjectPromise = InjectPromise;
function InjectLazy() {
    var tokens = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        tokens[_i] = arguments[_i];
    }
    return function (fn) {
        annotate(fn, new (InjectLazyDecorator.bind.apply(InjectLazyDecorator, [void 0].concat(tokens)))());
    };
}
exports.InjectLazy = InjectLazy;
function Provide(token) {
    return function (fn) {
        annotate(fn, new ProvideDecorator(token));
    };
}
exports.Provide = Provide;
function ProvidePromise(token) {
    return function (fn) {
        annotate(fn, new ProvidePromiseDecorator(token));
    };
}
exports.ProvidePromise = ProvidePromise;
