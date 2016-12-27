import {
  annotate,
  readAnnotations,
  hasAnnotation,
  ProvideDecorator as ProvideAnnotation,
  TransientScope as TransientScopeAnnotation,
  IClassInterface
} from './annotations';
import {isFunction, toString} from './util';
import {profileInjector} from './profiler';
import {createProviderFromFnOrClass} from './providers';

/**
 * If a token is passed in, add it into the resolving array.
 * We need to check arguments.length because it can be null/undefined.
 */
export function constructResolvingMessage<T>(resolving: IClassInterface<T>[], token ?: IClassInterface<T>)
{
  if (arguments.length > 1)
  {
    resolving.push(token);
  }

  if (resolving.length > 1)
  {
    return ` (${resolving.map(toString).join(' -> ')})`;
  }

  return '';
}

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
export class Injector
{
  protected _cache: any;
  protected _providers: any;
  protected _parent: any;
  protected _scopes: any;

  constructor(modules: any[] = [], parentInjector: any = null, providers = new Map(), scopes: any[] = [])
  {
    this._cache = new Map();
    this._providers = providers;
    this._parent = parentInjector;
    this._scopes = scopes;

    this._loadModules(modules);

    profileInjector(this, Injector);
  }

  /**
  * Collect all registered providers that has given annotation.
  * Including providers defined in parent injectors.
  */
  protected _collectProvidersWithAnnotation(annotationClass: any, collectedProviders: any)
  {
    this._providers.forEach( <T>(provider: any, token: IClassInterface<T | this>) =>
    {
      if (!collectedProviders.has(token) && hasAnnotation(provider.provider, annotationClass))
      {
        collectedProviders.set(token, provider);
      }
    });

    if (this._parent)
    {
      this._parent._collectProvidersWithAnnotation(annotationClass, collectedProviders);
    }
  }

  /**
  * Load modules/function/classes.
  * This mutates `this._providers`, but it is only called during the constructor.
  */
  protected _loadModules(modules: any)
  {
    for (let module of modules)
    {
      // A single provider (class or function).
      if (isFunction(module))
      {
        this._loadFnOrClass(module);
        continue;
      }

      throw new Error('Invalid module!');
    }
  }

  /**
  * Load a function or class.
  * This mutates `this._providers`, but it is only called during the constructor.
  */
  protected _loadFnOrClass(fnOrClass: any)
  {
    // @todo(vojta): should we expose provider.token?
    let annotations = readAnnotations(fnOrClass);
    let token = annotations.provide.token || fnOrClass;
    let provider = createProviderFromFnOrClass(fnOrClass, annotations);

    this._providers.set(token, provider);
  }

  /**
  * Returns true if there is any provider registered for given token.
  * Including parent injectors.
  */
  protected _hasProviderFor<T>(token: IClassInterface<T | this>): boolean
  {
    if (this._providers.has(token))
    {
      return true;
    }

    if (this._parent)
    {
      return this._parent._hasProviderFor(token);
    }

    return false;
  }

  /**
   * Find the correct injector where the default provider should be instantiated and cached.
   */
  protected _instantiateDefaultProvider<T>(provider: any, token: IClassInterface<T | this>, resolving: IClassInterface<T | this>[], wantPromise: any, wantLazy: any): any
  {
    // In root injector, instantiate here.
    if (!this._parent)
    {
      this._providers.set(token, provider);
      return this.get(token, resolving, wantPromise, wantLazy);
    }

    // Check if this injector forces new instance of this provider.
    for (let ScopeClass of this._scopes)
    {
      if (hasAnnotation(provider.provider, ScopeClass))
      {
        this._providers.set(token, provider);
        return this.get(token, resolving, wantPromise, wantLazy);
      }
    }

    // Otherwise ask parent injector.
    return this._parent._instantiateDefaultProvider(provider, token, resolving, wantPromise, wantLazy);
  }


  /**
   * Return an instance for given token.
   */
  get<T>(token: IClassInterface<T>, resolving?: IClassInterface<T>[]): T;
  get(token: IClassInterface<this>, resolving?: IClassInterface<this>[]): this;
  get<T>(token: IClassInterface<T>, resolving?: IClassInterface<T>[], wantPromise?: boolean): T | Promise<T>;
  get(token: IClassInterface<this>, resolving?: IClassInterface<this>[], wantPromise?: boolean): this | Promise<this>;
  get<T>(token: IClassInterface<T>, resolving?: IClassInterface<T>[], wantPromise?: boolean, wantLazy?: boolean): T | Promise<T> | Function;
  get(token: IClassInterface<this>, resolving?: IClassInterface<this>[], wantPromise?: boolean, wantLazy?: boolean): this | Promise<this> | Function;
  get<T>(token: IClassInterface<T | this>, resolving: IClassInterface<T | this>[] = [], wantPromise = false, wantLazy = false): T | this | Promise<T | this> | Function
  {
    let resolvingMsg = '';
    let provider: any;
    let instance: T | Promise<T>;
    let injector: Injector = this;

    if (token === null || token === undefined)
    {
      resolvingMsg = constructResolvingMessage(resolving, token);
      throw new Error(`Invalid token "${token}" requested!${resolvingMsg}`);
    }

    // Special case, return itself.
    if (token === Injector)
    {
      if (wantPromise)
      {
        return Promise.resolve(this);
      }

      return this;
    }

    /**
     * @todo(vojta): optimize - no child injector for locals?
     */
    if (wantLazy)
    {
      return function createLazyInstance()
      {
        let lazyInjector = injector;

        if (arguments.length)
        {
          let locals = [];
          let args = arguments;

          for (let i = 0; i < args.length; i += 2)
          {
            locals.push((function(ii)
            {
              let fn = function createLocalInstance()
              {
                return args[ii + 1];
              };

              annotate(fn, new ProvideAnnotation(args[ii]));

              return fn;
            })(i));
          }

          lazyInjector = injector.createChild(locals);
        }

        return lazyInjector.get(token, resolving, wantPromise, false);
      };
    }

    // Check if there is a cached instance already.
    if (this._cache.has(token))
    {
      instance = this._cache.get(token);
      provider = this._providers.get(token);

      if (provider.isPromise && !wantPromise)
      {
        resolvingMsg = constructResolvingMessage(resolving, token);
        throw new Error(`Cannot instantiate ${toString(token)} synchronously. It is provided as a promise!${resolvingMsg}`);
      }

      if (!provider.isPromise && wantPromise)
      {
        return Promise.resolve(instance);
      }

      return instance;
    }

    provider = this._providers.get(token);

    // No provider defined (overridden), use the default provider (token).
    if (!provider && isFunction(token) && !this._hasProviderFor(token))
    {
      provider = createProviderFromFnOrClass(token, readAnnotations(token));
      return this._instantiateDefaultProvider(provider, token, resolving, wantPromise, wantLazy);
    }

    if (!provider)
    {
      if (!this._parent)
      {
        resolvingMsg = constructResolvingMessage(resolving, token);
        throw new Error(`No provider for ${toString(token)}!${resolvingMsg}`);
      }

      return this._parent.get(token, resolving, wantPromise, wantLazy);
    }

    if (resolving.indexOf(token) !== -1)
    {
      resolvingMsg = constructResolvingMessage(resolving, token);
      throw new Error(`Cannot instantiate cyclic dependency!${resolvingMsg}`);
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
    let delayingInstantiation = wantPromise && provider.params.some( (param: any) => !param.isPromise);
    let args = provider.params.map( (param: any) =>
    {
      if (delayingInstantiation)
      {
        return this.get(param.token, resolving, true, param.isLazy);
      }

      return this.get(param.token, resolving, param.isPromise, param.isLazy);
    });

    // Delaying the instantiation - return a promise.
    if (delayingInstantiation)
    {
      let delayedResolving = resolving.slice(); // clone

      resolving.pop();

      // Once all dependencies (promises) are resolved, instantiate.
      return Promise.all(args).then( args =>
      {
        try
        {
          instance = provider.create(args);
        }
        catch (e)
        {
          resolvingMsg = constructResolvingMessage(delayedResolving);
          let originalMsg = 'ORIGINAL ERROR: ' + e.message;
          e.message = `Error during instantiation of ${toString(token)}!${resolvingMsg}\n${originalMsg}`;
          throw e;
        }

        if (!hasAnnotation(provider.provider, TransientScopeAnnotation))
        {
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

    try
    {
      instance = provider.create(args);
    }
    catch (e)
    {
      resolvingMsg = constructResolvingMessage(resolving);
      let originalMsg = 'ORIGINAL ERROR: ' + e.message;
      e.message = `Error during instantiation of ${toString(token)}!${resolvingMsg}\n${originalMsg}`;
      throw e;
    }

    if (!hasAnnotation(provider.provider, TransientScopeAnnotation))
    {
      this._cache.set(token, instance);
    }

    if (!wantPromise && provider.isPromise)
    {
      resolvingMsg = constructResolvingMessage(resolving);

      throw new Error(`Cannot instantiate ${toString(token)} synchronously. It is provided as a promise!${resolvingMsg}`);
    }

    if (wantPromise && !provider.isPromise)
    {
      instance = Promise.resolve(instance);
    }

    resolving.pop();

    return instance;
  }


  getPromise<T>(token: IClassInterface<T | this>)
  {
    return this.get(token, [], true);
  }

  /**
  * Create a child injector, which encapsulate shorter life scope.
  * It is possible to add additional providers and also force new instances of existing providers.
  */
  createChild(modules: any[] = [], forceNewInstancesOf: any[] = [])
  {
    let forcedProviders = new Map();

    // Always force new instance of TransientScope.
    forceNewInstancesOf.push(TransientScopeAnnotation);

    for (let annotation of forceNewInstancesOf)
    {
      this._collectProvidersWithAnnotation(annotation, forcedProviders);
    }

    return new Injector(modules, this, forcedProviders, forceNewInstancesOf);
  }
}
