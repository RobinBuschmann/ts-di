"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var index_js_1 = require("./index.js");
var injector = new index_js_1.Injector();
var msg = 'this is message from property of class A';
var A = (function () {
    function A() {
        this.message = msg;
    }
    return A;
}());
describe("Using decorator", function () {
    var B = (function () {
        function B(instanceA) {
            this.message = '';
            this.message = instanceA.message;
        }
        return B;
    }());
    B = __decorate([
        index_js_1.Inject(A)
    ], B);
    var C = (function () {
        function C(instanceB) {
            var _this = this;
            this.message = '';
            this.getValue = function () {
                return _this.message;
            };
            this.message = instanceB.message;
        }
        return C;
    }());
    C = __decorate([
        index_js_1.Inject(B)
    ], C);
    var instanceC = injector.get(C);
    it("\n + Should create instance of C", function () {
        var obj = (new C(new B(new A)));
        expect(instanceC.toString()).toEqual(obj.toString());
    });
    it("\n + Should not to throw during call C.getValue()", function () {
        expect(instanceC.getValue).not.toThrow();
    });
    it("\n + Should be not empty", function () {
        expect(instanceC.getValue().length).toBeGreaterThan(0);
    });
    it("\n + Should to return message from class A", function () {
        expect(instanceC.getValue()).toEqual(msg);
    });
});
describe("Using annotation function", function () {
    var B = (function () {
        function B(instanceA) {
            this.message = '';
            this.message = instanceA.message;
        }
        return B;
    }());
    index_js_1.annotate(B, new index_js_1.InjectDecorator(A));
    var C = (function () {
        function C(instanceB) {
            var _this = this;
            this.message = '';
            this.getValue = function () {
                return _this.message;
            };
            this.message = instanceB.message;
        }
        return C;
    }());
    index_js_1.annotate(C, new index_js_1.InjectDecorator(B));
    var instanceC = injector.get(C);
    it("\n + Should create instance of C", function () {
        var obj = (new C(new B(new A)));
        expect(instanceC.toString()).toEqual(obj.toString());
    });
    it("\n + Should not to throw during call C.getValue()", function () {
        expect(instanceC.getValue).not.toThrow();
    });
    it("\n + Should be not empty", function () {
        expect(instanceC.getValue().length).toBeGreaterThan(0);
    });
    it("\n + Should to return message from class A", function () {
        expect(instanceC.getValue()).toEqual(msg);
    });
});
