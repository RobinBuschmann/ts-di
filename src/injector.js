"use strict";
var annotations_1 = require("./annotations");
var util_1 = require("./util");
var profiler_1 = require("./profiler");
var providers_1 = require("./providers");
/**
 * If a token is passed in, add it into the resolving array.
 * We need to check arguments.length because it can be null/undefined.
 */
function constructResolvingMessage(resolving, token) {
    if (arguments.length > 1) {
        resolving.push(token);
    }
    if (resolving.length > 1) {
        return " (" + resolving.map(util_1.toString).join(' -> ') + ")";
    }
    return '';
}
exports.constructResolvingMessage = constructResolvingMessage;
/**
* Injector encapsulate a life scope.
* There is exactly one instance for given token in given injector.
*
* All the state is immutable, the only state changes is the cache. There is however no way to produce different instance under given token. In that sense it is immutable.
*
* Injector is responsible for:
* - resolving tokens into
*   - provider
*   - value (cache/calling provider)
* - dealing with isPromise
* - dealing with isLazy
* - loading different "providers" and modules
*/
var Injector = (function () {
    function Injector(modules, parentInjector, providers, scopes) {
        if (modules === void 0) { modules = []; }
        if (parentInjector === void 0) { parentInjector = null; }
        if (providers === void 0) { providers = new Map(); }
        if (scopes === void 0) { scopes = []; }
        this._cache = new Map();
        this._providers = providers;
        this._parent = parentInjector;
        this._scopes = scopes;
        this._loadModules(modules);
        profiler_1.profileInjector(this, Injector);
    }
    /**
    * Collect all registered providers that has given annotation.
    * Including providers defined in parent injectors.
    */
    Injector.prototype._collectProvidersWithAnnotation = function (annotationClass, collectedProviders) {
        this._providers.forEach(function (provider, token) {
            if (!collectedProviders.has(token) && annotations_1.hasAnnotation(provider.provider, annotationClass)) {
                collectedProviders.set(token, provider);
            }
        });
        if (this._parent) {
            this._parent._collectProvidersWithAnnotation(annotationClass, collectedProviders);
        }
    };
    /**
    * Load modules/function/classes.
    * This mutates `this._providers`, but it is only called during the constructor.
    */
    Injector.prototype._loadModules = function (modules) {
        for (var _i = 0, modules_1 = modules; _i < modules_1.length; _i++) {
            var module_1 = modules_1[_i];
            // A single provider (class or function).
            if (util_1.isFunction(module_1)) {
                this._loadFnOrClass(module_1);
                continue;
            }
            throw new Error('Invalid module!');
        }
    };
    /**
    * Load a function or class.
    * This mutates `this._providers`, but it is only called during the constructor.
    */
    Injector.prototype._loadFnOrClass = function (fnOrClass) {
        // @todo(vojta): should we expose provider.token?
        var annotations = annotations_1.readAnnotations(fnOrClass);
        var token = annotations.provide.token || fnOrClass;
        var provider = providers_1.createProviderFromFnOrClass(fnOrClass, annotations);
        this._providers.set(token, provider);
    };
    /**
    * Returns true if there is any provider registered for given token.
    * Including parent injectors.
    */
    Injector.prototype._hasProviderFor = function (token) {
        if (this._providers.has(token)) {
            return true;
        }
        if (this._parent) {
            return this._parent._hasProviderFor(token);
        }
        return false;
    };
    /**
     * Find the correct injector where the default provider should be instantiated and cached.
     */
    Injector.prototype._instantiateDefaultProvider = function (provider, token, resolving, wantPromise, wantLazy) {
        // In root injector, instantiate here.
        if (!this._parent) {
            this._providers.set(token, provider);
            return this.get(token, resolving, wantPromise, wantLazy);
        }
        // Check if this injector forces new instance of this provider.
        for (var _i = 0, _a = this._scopes; _i < _a.length; _i++) {
            var ScopeClass = _a[_i];
            if (annotations_1.hasAnnotation(provider.provider, ScopeClass)) {
                this._providers.set(token, provider);
                return this.get(token, resolving, wantPromise, wantLazy);
            }
        }
        // Otherwise ask parent injector.
        return this._parent._instantiateDefaultProvider(provider, token, resolving, wantPromise, wantLazy);
    };
    Injector.prototype.get = function (token, resolving, wantPromise, wantLazy) {
        var _this = this;
        if (resolving === void 0) { resolving = []; }
        if (wantPromise === void 0) { wantPromise = false; }
        if (wantLazy === void 0) { wantLazy = false; }
        var resolvingMsg = '';
        var provider;
        var instance;
        var injector = this;
        if (token === null || token === undefined) {
            resolvingMsg = constructResolvingMessage(resolving, token);
            throw new Error("Invalid token \"" + token + "\" requested!" + resolvingMsg);
        }
        // Special case, return itself.
        if (token === Injector) {
            if (wantPromise) {
                return Promise.resolve(this);
            }
            return this;
        }
        /**
         * @todo(vojta): optimize - no child injector for locals?
         */
        if (wantLazy) {
            return function createLazyInstance() {
                var lazyInjector = injector;
                if (arguments.length) {
                    var locals = [];
                    var args_1 = arguments;
                    for (var i = 0; i < args_1.length; i += 2) {
                        locals.push((function (ii) {
                            var fn = function createLocalInstance() {
                                return args_1[ii + 1];
                            };
                            annotations_1.annotate(fn, new annotations_1.ProvideDecorator(args_1[ii]));
                            return fn;
                        })(i));
                    }
                    lazyInjector = injector.createChild(locals);
                }
                return lazyInjector.get(token, resolving, wantPromise, false);
            };
        }
        // Check if there is a cached instance already.
        if (this._cache.has(token)) {
            instance = this._cache.get(token);
            provider = this._providers.get(token);
            if (provider.isPromise && !wantPromise) {
                resolvingMsg = constructResolvingMessage(resolving, token);
                throw new Error("Cannot instantiate " + util_1.toString(token) + " synchronously. It is provided as a promise!" + resolvingMsg);
            }
            if (!provider.isPromise && wantPromise) {
                return Promise.resolve(instance);
            }
            return instance;
        }
        provider = this._providers.get(token);
        // No provider defined (overridden), use the default provider (token).
        if (!provider && util_1.isFunction(token) && !this._hasProviderFor(token)) {
            provider = providers_1.createProviderFromFnOrClass(token, annotations_1.readAnnotations(token));
            return this._instantiateDefaultProvider(provider, token, resolving, wantPromise, wantLazy);
        }
        if (!provider) {
            if (!this._parent) {
                resolvingMsg = constructResolvingMessage(resolving, token);
                throw new Error("No provider for " + util_1.toString(token) + "!" + resolvingMsg);
            }
            return this._parent.get(token, resolving, wantPromise, wantLazy);
        }
        if (resolving.indexOf(token) !== -1) {
            resolvingMsg = constructResolvingMessage(resolving, token);
            throw new Error("Cannot instantiate cyclic dependency!" + resolvingMsg);
        }
        resolving.push(token);
        // @todo(vojta): handle these cases:
        // 1/
        // - requested as promise (delayed)
        // - requested again as promise (before the previous gets resolved) -> cache the promise
        // 2/
        // - requested as promise (delayed)
        // - requested again sync (before the previous gets resolved)
        // -> error, but let it go inside to throw where exactly is the async provider
        var delayingInstantiation = wantPromise && provider.params.some(function (param) { return !param.isPromise; });
        var args = provider.params.map(function (param) {
            if (delayingInstantiation) {
                return _this.get(param.token, resolving, true, param.isLazy);
            }
            return _this.get(param.token, resolving, param.isPromise, param.isLazy);
        });
        // Delaying the instantiation - return a promise.
        if (delayingInstantiation) {
            var delayedResolving_1 = resolving.slice(); // clone
            resolving.pop();
            // Once all dependencies (promises) are resolved, instantiate.
            return Promise.all(args).then(function (args) {
                try {
                    instance = provider.create(args);
                }
                catch (e) {
                    resolvingMsg = constructResolvingMessage(delayedResolving_1);
                    var originalMsg = 'ORIGINAL ERROR: ' + e.message;
                    e.message = "Error during instantiation of " + util_1.toString(token) + "!" + resolvingMsg + "\n" + originalMsg;
                    throw e;
                }
                if (!annotations_1.hasAnnotation(provider.provider, annotations_1.TransientScope)) {
                    injector._cache.set(token, instance);
                }
                // @todo(vojta): if a provider returns a promise (but is not declared as @ProvidePromise),
                // here the value will get unwrapped (because it is returned from a promise callback) and
                // the actual value will be injected. This is probably not desired behavior. Maybe we could
                // get rid off the @ProvidePromise and just check the returned value, whether it is
                // a promise or not.
                return instance;
            });
        }
        try {
            instance = provider.create(args);
        }
        catch (e) {
            resolvingMsg = constructResolvingMessage(resolving);
            var originalMsg = 'ORIGINAL ERROR: ' + e.message;
            e.message = "Error during instantiation of " + util_1.toString(token) + "!" + resolvingMsg + "\n" + originalMsg;
            throw e;
        }
        if (!annotations_1.hasAnnotation(provider.provider, annotations_1.TransientScope)) {
            this._cache.set(token, instance);
        }
        if (!wantPromise && provider.isPromise) {
            resolvingMsg = constructResolvingMessage(resolving);
            throw new Error("Cannot instantiate " + util_1.toString(token) + " synchronously. It is provided as a promise!" + resolvingMsg);
        }
        if (wantPromise && !provider.isPromise) {
            instance = Promise.resolve(instance);
        }
        resolving.pop();
        return instance;
    };
    Injector.prototype.getPromise = function (token) {
        return this.get(token, [], true);
    };
    /**
    * Create a child injector, which encapsulate shorter life scope.
    * It is possible to add additional providers and also force new instances of existing providers.
    */
    Injector.prototype.createChild = function (modules, forceNewInstancesOf) {
        if (modules === void 0) { modules = []; }
        if (forceNewInstancesOf === void 0) { forceNewInstancesOf = []; }
        var forcedProviders = new Map();
        // Always force new instance of TransientScope.
        forceNewInstancesOf.push(annotations_1.TransientScope);
        for (var _i = 0, forceNewInstancesOf_1 = forceNewInstancesOf; _i < forceNewInstancesOf_1.length; _i++) {
            var annotation = forceNewInstancesOf_1[_i];
            this._collectProvidersWithAnnotation(annotation, forcedProviders);
        }
        return new Injector(modules, this, forcedProviders, forceNewInstancesOf);
    };
    return Injector;
}());
exports.Injector = Injector;
