"use strict";
var annotations_1 = require("./annotations");
var util_1 = require("./util");
function isClass(clsOrFunction) {
    if (annotations_1.hasAnnotation(clsOrFunction, annotations_1.ClassProvider)) {
        return true;
    }
    else if (annotations_1.hasAnnotation(clsOrFunction, annotations_1.FactoryProvider)) {
        return false;
    }
    else if (clsOrFunction.name && clsOrFunction.name.length && clsOrFunction.name.length > 3) {
        return util_1.isUpperCase(clsOrFunction.name.charAt(0));
    }
    else {
        return util_1.ownKeys(clsOrFunction.prototype).length > 0;
    }
}
// Provider is responsible for creating instances.
//
// responsibilities:
// - create instances
//
// communication:
// - exposes `create()` which creates an instance of something
// - exposes `params` (information about which arguments it requires to be passed into `create()`)
//
// Injector reads `provider.params` first, create these dependencies (however it wants),
// then calls `provider.create(args)`, passing in these arguments.
var EmptyFunction = Object.getPrototypeOf(Function);
/**
* It knows how to instantiate classes.
*
* If a class inherits (has parent constructors), this provider normalizes all the dependencies
* into a single flat array first, so that the injector does not need to worry about inheritance.
*
* - all the state is immutable (constructed)
*
* @todo(vojta): super constructor - should be only allowed during the constructor call?
*/
var ClassProvider = (function () {
    function ClassProvider(clazz, params, isPromise) {
        // @todo(vojta): can we hide this.provider? (only used for hasAnnotation(provider.provider))
        this.provider = clazz;
        this.isPromise = isPromise;
        this.params = [];
        this._constructors = [];
        this._flattenParams(clazz, params);
        this._constructors.unshift([clazz, 0, this.params.length - 1]);
    }
    /**
    * Normalize params for all the constructors (in the case of inheritance),
    * into a single flat array of DependencyDescriptors.
    * So that the injector does not have to worry about inheritance.
    *
    * This function mutates `this.params` and `this._constructors`,
    * but it is only called during the constructor.
    * @todo(vojta): remove the annotations argument?
    */
    ClassProvider.prototype._flattenParams = function (constructor, params) {
        var SuperConstructor;
        var constructorInfo;
        for (var _i = 0, params_1 = params; _i < params_1.length; _i++) {
            var param = params_1[_i];
            if (param.token === annotations_1.SuperConstructor) {
                SuperConstructor = Object.getPrototypeOf(constructor);
                if (SuperConstructor === EmptyFunction) {
                    throw new Error(util_1.toString(constructor) + " does not have a parent constructor. Only classes with a parent can ask for SuperConstructor!");
                }
                constructorInfo = [SuperConstructor, this.params.length];
                this._constructors.push(constructorInfo);
                this._flattenParams(SuperConstructor, annotations_1.readAnnotations(SuperConstructor).params);
                constructorInfo.push(this.params.length - 1);
            }
            else {
                this.params.push(param);
            }
        }
    };
    /**
    * Basically the reverse process to `this._flattenParams`:
    * We get arguments for all the constructors as a single flat array.
    * This method generates pre-bound "superConstructor" wrapper with correctly passing arguments.
    */
    ClassProvider.prototype._createConstructor = function (currentConstructorIdx, context, allArguments) {
        var constructorInfo = this._constructors[currentConstructorIdx];
        var nextConstructorInfo = this._constructors[currentConstructorIdx + 1];
        var argsForCurrentConstructor;
        if (nextConstructorInfo) {
            argsForCurrentConstructor = allArguments
                .slice(constructorInfo[1], nextConstructorInfo[1])
                .concat([this._createConstructor(currentConstructorIdx + 1, context, allArguments)])
                .concat(allArguments.slice(nextConstructorInfo[2] + 1, constructorInfo[2] + 1));
        }
        else {
            argsForCurrentConstructor = allArguments.slice(constructorInfo[1], constructorInfo[2] + 1);
        }
        return function InjectedAndBoundSuperConstructor() {
            // @todo(vojta): throw if arguments given
            return new ((_a = constructorInfo[0]).bind.apply(_a, [void 0].concat(argsForCurrentConstructor)))();
            var _a;
        };
    };
    // It is called by injector to create an instance.
    ClassProvider.prototype.create = function (args) {
        var context = Object.create(this.provider.prototype);
        var constructor = this._createConstructor(0, context, args);
        var returnedValue = constructor();
        if (util_1.isFunction(returnedValue) || util_1.isObject(returnedValue)) {
            return returnedValue;
        }
        return context;
    };
    return ClassProvider;
}());
/**
* FactoryProvider knows how to create instance from a factory function.
* - all the state is immutable
*/
var FactoryProvider = (function () {
    function FactoryProvider(factoryFunction, params, isPromise) {
        this.provider = factoryFunction;
        this.params = params;
        this.isPromise = isPromise;
        for (var _i = 0, params_2 = params; _i < params_2.length; _i++) {
            var param = params_2[_i];
            if (param.token === annotations_1.SuperConstructor) {
                throw new Error(util_1.toString(factoryFunction) + " is not a class. Only classes with a parent can ask for SuperConstructor!");
            }
        }
    }
    FactoryProvider.prototype.create = function (args) {
        return this.provider.apply(undefined, args);
    };
    return FactoryProvider;
}());
exports.FactoryProvider = FactoryProvider;
function createProviderFromFnOrClass(fnOrClass, annotations) {
    if (isClass(fnOrClass)) {
        return new ClassProvider(fnOrClass, annotations.params, annotations.provide.isPromise);
    }
    return new FactoryProvider(fnOrClass, annotations.params, annotations.provide.isPromise);
}
exports.createProviderFromFnOrClass = createProviderFromFnOrClass;
