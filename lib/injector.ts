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
import {createProviderFromFnOrClass, ClassProvider, FactoryProvider, ValueProvider, isClass} from './providers';

/**
 * If a token is passed in, add it into the resolving array.
 * We need to check arguments.length because it can be null/undefined.
 */
export function constructResolvingMessage<T>(resolving: Array<IClassInterface<T>>,
                                             token?: IClassInterface<T>): string {

  if (token !== void 0) {
    resolving.push(token);
  }

  if (resolving.length > 1) {
    return ` (${resolving.map(toString).join(' -> ')})`;
  }

  return '';
}

export interface IModule {
  provide: any;
  isPromise?: boolean;
}

export interface IValueModule extends IModule {
  useValue: any;
}

export interface IClassModule extends IModule {
  useClass: Function;
}

export interface IFactoryModule extends IModule {
  useFactory: Function;
}

export type Module = IValueModule|IFactoryModule|IClassModule;

/**
 * Injector encapsulate a life scope.
 * There is exactly one instance for given token in given injector.
 *
 * All the state is immutable, the only state changes is the cache. There is however no way
 * to produce different instance under given token. In that sense it is immutable.
 *
 * Injector is responsible for:
 * - resolving tokens into
 *   - provider
 *   - value (cache/calling provider)
 * - dealing with isPromise
 * - dealing with isLazy
 * - loading different "providers" and modules
 */
export class Injector {
  protected cache: Map<any, any>;

  constructor(modules: Array<Module|IClassInterface<any>> = [],
              protected parent: any = null,
              protected providers: Map<any, any> = new Map(),
              protected scopes: any[] = []) {

    this.cache = new Map();

    this.loadModules(modules);

    profileInjector(this, Injector);
  }

  /**
   * Collect all registered providers that has given annotation.
   * Including providers defined in parent injectors.
   */
  protected collectProvidersWithAnnotation(annotationClass: any,
                                           collectedProviders: any): void {
    this.providers.forEach(<T>(provider: any, token: IClassInterface<T>) => {
      if (!collectedProviders.has(token) && hasAnnotation(provider.provider, annotationClass)) {
        collectedProviders.set(token, provider);
      }
    });

    if (this.parent) {
      this.parent.collectProvidersWithAnnotation(annotationClass, collectedProviders);
    }
  }

  /**
   * Load modules/function/classes.
   * This mutates `this._providers`, but it is only called during the constructor.
   */
  protected loadModules(args: Array<Module|IClassInterface<any>>): void {
    for (const arg of args) {
      let module: Module;

      // A single provider (class or function).
      if (isClass(arg)) {

        const _class: any = arg;

        module = {provide: _class, useClass: _class};
      } else {
        module = arg as Module;
      }

      if ('provide' in module) {
        this.loadModule(module);
        continue;
      }

      throw new Error('Invalid module!');
    }
  }

  /**
   * Load a function or class.
   * This mutates `this._providers`, but it is only called during the constructor.
   */
  protected loadModule(module: Module): void {
    // @todo(vojta): should we expose provider.token?

    let provider;
    let token = module.provide;

    if ('useFactory' in module) {

      provider = new FactoryProvider((module as IFactoryModule).useFactory, [], !!module.isPromise);

    } else if ('useValue' in module) {

      provider = new ValueProvider((module as IValueModule).useValue, [], !!module.isPromise);

    } else if ('useClass' in module) {

      const classModule = (module as IClassModule);
      const annotations = readAnnotations(classModule.useClass);
      const isPromise = annotations.provide.isPromise || !!module.isPromise;
      token = annotations.provide.token || token;

      provider = new ClassProvider(classModule.useClass, annotations.params, isPromise);
    }

    this.providers.set(module.provide, provider);
  }

  /**
   * Returns true if there is any provider registered for given token.
   * Including parent injectors.
   */
  protected hasProviderFor<T>(token: IClassInterface<T>): boolean {
    if (this.providers.has(token)) {
      return true;
    }

    if (this.parent) {
      return this.parent.hasProviderFor(token);
    }

    return false;
  }

  /**
   * Find the correct injector where the default provider should be instantiated and cached.
   */
  // tslint:disable:max-line-length
  protected instantiateDefaultProvider<T>(provider: any, token: IClassInterface<T>, resolving: Array<IClassInterface<T>>, wantPromise: any, wantLazy: any): any
  protected instantiateDefaultProvider<T>(provider: any, token: IClassInterface<this>, resolving: Array<IClassInterface<this>>, wantPromise: any, wantLazy: any): any
  protected instantiateDefaultProvider<T>(provider: any, token: IClassInterface<T | this>, resolving: Array<IClassInterface<T | this>>, wantPromise: any, wantLazy: any): any {
    // In root injector, instantiate here.
    if (!this.parent) {
      this.providers.set(token, provider);
      return this.get(token, resolving, wantPromise, wantLazy);
    }

    // Check if this injector forces new instance of this provider.
    for (const ScopeClass of this.scopes) {
      if (hasAnnotation(provider.provider, ScopeClass)) {
        this.providers.set(token, provider);
        return this.get(token, resolving, wantPromise, wantLazy);
      }
    }

    // Otherwise ask parent injector.
    return this.parent.instantiateDefaultProvider(provider, token, resolving, wantPromise, wantLazy);
  }


  /**
   * Return an instance for given token.
   */

  // tslint:disable:unified-signatures
  // tslint:disable:max-line-length
  get<T>(token: IClassInterface<T>, resolving?: Array<IClassInterface<T>>): T;
  get(token: IClassInterface<this>, resolving?: Array<IClassInterface<this>>): this;
  get<T>(token: IClassInterface<T>, resolving?: Array<IClassInterface<T>>, wantPromise?: false): T;
  get<T>(token: IClassInterface<T>, resolving?: Array<IClassInterface<T>>, wantPromise?: true): Promise<T>;
  get(token: IClassInterface<this>, resolving?: Array<IClassInterface<this>>, wantPromise?: false): this;
  get(token: IClassInterface<this>, resolving?: Array<IClassInterface<this>>, wantPromise?: true): Promise<this>;
  get<T>(token: IClassInterface<T>, resolving?: Array<IClassInterface<T>>, wantPromise?: boolean, wantLazy?: boolean): T | Promise<T> | Function;
  get(token: IClassInterface<this>, resolving?: Array<IClassInterface<this>>, wantPromise?: boolean, wantLazy?: boolean): this | Promise<this> | Function;
  get<T>(token: IClassInterface<T | this>, resolving: Array<IClassInterface<T | this>> = [], wantPromise: boolean = false, wantLazy: boolean = false): T | this | Promise<T | this> | Function {
    let resolvingMsg = '';
    let provider: any;
    let instance: T | Promise<T>;
    const injector: Injector = this;

    if (token === null || token === undefined) {
      resolvingMsg = constructResolvingMessage(resolving, token);
      throw new Error(`Invalid token "${token}" requested!${resolvingMsg}`);
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
      return function createLazyInstance(...args: any[]): any {
        let lazyInjector = injector;

        if (args.length) {
          const locals: any[] = [];

          for (let i = 0; i < args.length; i += 2) {
            locals.push(((ii) => {

              const fn = () => args[ii + 1];

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
    if (this.cache.has(token)) {
      instance = this.cache.get(token);
      provider = this.providers.get(token);

      if (provider.isPromise && !wantPromise) {
        resolvingMsg = constructResolvingMessage(resolving, token);
        throw new Error(`Cannot instantiate ${toString(token)} synchronously. It is provided as a promise!${resolvingMsg}`);
      }

      if (!provider.isPromise && wantPromise) {
        return Promise.resolve(instance);
      }

      return instance;
    }

    provider = this.providers.get(token);

    // No provider defined (overridden), use the default provider (token).
    if (!provider && isFunction(token) && !this.hasProviderFor(token)) {
      provider = createProviderFromFnOrClass(token, readAnnotations(token));
      return this.instantiateDefaultProvider(provider, token, resolving, wantPromise, wantLazy);
    }

    if (!provider) {
      if (!this.parent) {
        resolvingMsg = constructResolvingMessage(resolving, token);
        throw new Error(`No provider for ${toString(token)}!${resolvingMsg}`);
      }

      return this.parent.get(token, resolving, wantPromise, wantLazy);
    }

    if (resolving.indexOf(token) !== -1) {
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
    const delayingInstantiation = wantPromise && provider.params.some((param: any) => !param.isPromise);
    const args = provider.params.map((param: any) => {
      if (delayingInstantiation) {
        return this.get(param.token, resolving, true, param.isLazy);
      }

      return this.get(param.token, resolving, param.isPromise, param.isLazy);
    });

    // Delaying the instantiation - return a promise.
    if (delayingInstantiation) {

      resolving.pop();

      // Once all dependencies (promises) are resolved, instantiate.
      return Promise.all(args).then(_args => {

        instance = this.createAndCacheInstance(provider, token, _args, resolving, resolvingMsg);

        // @todo(vojta): if a provider returns a promise (but is not declared as @ProvidePromise),
        // here the value will get unwrapped (because it is returned from a promise callback) and
        // the actual value will be injected. This is probably not desired behavior. Maybe we could
        // get rid off the @ProvidePromise and just check the returned value, whether it is
        // a promise or not.
        return instance;
      });
    }

    instance = this.createAndCacheInstance(provider, token, args, resolving, resolvingMsg);

    if (!wantPromise && provider.isPromise) {
      resolvingMsg = constructResolvingMessage(resolving);

      throw new Error(`Cannot instantiate ${toString(token)} synchronously. It is provided as a promise!${resolvingMsg}`);
    }

    if (wantPromise && !provider.isPromise) {
      instance = Promise.resolve(instance);
    }

    resolving.pop();

    return instance;
  }


  getPromise<T>(token: IClassInterface<T>): Promise<T>;
  getPromise<T>(token: IClassInterface<this>): Promise<this>;
  getPromise<T>(token: IClassInterface<T | this>): Promise<T | this> {
    return this.get(token, [], true);
  }

  /**
   * Create a child injector, which encapsulate shorter life scope.
   * It is possible to add additional providers and also force new instances of existing providers.
   */
  createChild(modules: any[] = [], forceNewInstancesOf: any[] = []): Injector {

    const forcedProviders = new Map();

    // Always force new instance of TransientScope.
    forceNewInstancesOf.push(TransientScopeAnnotation);

    for (const annotation of forceNewInstancesOf) {
      this.collectProvidersWithAnnotation(annotation, forcedProviders);
    }

    return new Injector(modules, this, forcedProviders, forceNewInstancesOf);
  }

  /**
   * Creates and caches instance
   * @throws Error when instance creation fails
   */
  private createAndCacheInstance(provider: any,
                                 token: any,
                                 args: any,
                                 resolving: any,
                                 resolvingMsg: any): any {

    let instance;

    try {
      instance = provider.create(args);
    } catch (e) {
      resolvingMsg = constructResolvingMessage(resolving);
      const originalMsg = 'ORIGINAL ERROR: ' + e.message;
      e.message = `Error during instantiation of ${toString(token)}!${resolvingMsg}\n${originalMsg}`;
      throw e;
    }

    if (provider.provider !== null && typeof provider.provider !== 'object' ||
      !hasAnnotation(provider.provider, TransientScopeAnnotation)) {
      this.cache.set(token, instance);
    }

    return instance;
  }
}
