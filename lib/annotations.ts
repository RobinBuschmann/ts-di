import 'reflect-metadata';
import {
  getPromiseMeta, getLazyMeta, setPromiseMeta, setLazyMeta, getAnnotations, setAnnotations,
  getFactoryMeta, setFactoryMeta, markAsFactory
} from "./metadata";

// This module contains:
// - built-in annotation classes
// - helpers to read/write annotations

export interface IClassInterface<T> {
  new (...params: any[]): T;
}


// ANNOTATIONS

/**
 * A built-in token.
 * Used to ask for pre-injected parent constructor.
 * A class constructor can ask for this.
 */
export class SuperConstructor {
}

/**
 * A built-in scope.
 * Never cache.
 */
export class TransientScope {
}

export class InjectDecorator {
  tokens: Array<IClassInterface<any>>;
  token: IClassInterface<any>;
  isPromise: boolean;
  isLazy: boolean;

  constructor(...tokens: Array<IClassInterface<any>>) {
    this.tokens = tokens;
    this.isPromise = false;
    this.isLazy = false;
  }
}

export class InjectPromiseDecorator extends InjectDecorator {
  constructor(...tokens: Array<IClassInterface<any>>) {
    super();
    this.tokens = tokens;
    this.isPromise = true;
    this.isLazy = false;
  }
}

export class InjectLazyDecorator extends InjectDecorator {
  constructor(...tokens: Array<IClassInterface<any>>) {
    super();
    this.tokens = tokens;
    this.isPromise = false;
    this.isLazy = true;
  }
}

export class ProvideDecorator {
  token: IClassInterface<any>|null;
  isPromise: boolean;

  constructor(token: IClassInterface<any>) {
    this.token = token;
    this.isPromise = false;
  }
}

export class ProvidePromiseDecorator extends ProvideDecorator {
  constructor(token: IClassInterface<any>) {
    super(token);
    this.token = token;
    this.isPromise = true;
  }
}

export class ClassProvider {
}
export class FactoryProvider {
}

// HELPERS

export interface IClassAnnotations {
  annotations ?: Array<InjectDecorator|ProvideDecorator>;
  parameters ?: any[];
}

/**
 * Append annotation on a function or class.
 * This can be helpful when not using ES6+.
 */
export function annotate(target: any,
                         ...annotations: Array<InjectDecorator | ProvideDecorator>): void {

  let _annotations = getAnnotations(target.prototype);

  if (!_annotations) {

    _annotations = annotations;
    setAnnotations(target.prototype, _annotations);
  } else {

    _annotations.unshift(...annotations);
  }
}

/**
 * Read annotations on a function or class and return whether given annotation is present.
 */
export function hasAnnotation(target: any,
                              annotationClass: any): boolean {

  const annotations = getAnnotations(target.prototype || target);

  if (!annotations || annotations.length === 0) {
    return false;
  }

  for (const annotation of annotations) {
    if (annotation instanceof annotationClass) {
      return true;
    }
  }
  return false;
}

export interface IParamsDescriptions {
  token: any;
  isPromise: boolean;
  isLazy ?: boolean;
}

export interface ICollectedAnnotation {

  provide: ProvideDecorator | InjectDecorator;
  params: IParamsDescriptions[];
}


/**
 * Read annotations on a function or class and collect "interesting" metadata.
 */
export function readAnnotations(target: any): ICollectedAnnotation {

  const collectedAnnotations: ICollectedAnnotation = {
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

  const annotations = getAnnotations(target.prototype || target);

  if (target && (typeof annotations === 'object')) {

    for (const annotation of annotations) {

      if (annotation instanceof InjectDecorator) {

        annotation.tokens.forEach(<T>(token: IClassInterface<T>) => {
          collectedAnnotations.params.push({
            token,
            isPromise: annotation.isPromise,
            isLazy: annotation.isLazy
          });
        });
      }

      if (annotation instanceof ProvideDecorator) {
        collectedAnnotations.provide.token = annotation.token;
        collectedAnnotations.provide.isPromise = annotation.isPromise;
      }
    }
  }

  return collectedAnnotations;
}

/**
 * Decorator versions of annotation classes
 */
export function Inject(target: any): void {

  const tokens: any[] = Reflect.getMetadata("design:paramtypes", target) || [];
  const promiseMeta = getPromiseMeta(target.prototype);
  const lazyMeta = getLazyMeta(target.prototype);
  const factoryMeta = getFactoryMeta(target.prototype);

  const annotations = tokens.map((token, index) => {

    const advancedDecorator = [
      [factoryMeta, InjectDecorator],
      [promiseMeta, InjectPromiseDecorator],
      [lazyMeta, InjectLazyDecorator],
    ].reduce<any>((result, current: any) => {

      if (result) return result;

      const [meta, decorator] = current;

      if (meta) {
        const foundMeta = meta.find(_meta => _meta.index === index);

        if (foundMeta) {
          return new decorator(foundMeta.token);
        }
      }

    }, void 0);

    return advancedDecorator || new InjectDecorator(token);
  });

  annotate(target, ...annotations);
}

export function InjectPromise(...tokens: any[]): Function {

  return (target: any) => annotate(target, new InjectPromiseDecorator(...tokens));
}

export function InjectLazy(...tokens: any[]): Function {

  return (target: any) => annotate(target, new InjectLazyDecorator(...tokens));
}

export function asPromise(token: IClassInterface<any>): Function {

  return (target: any, key: string, index: number) => {

    let promiseMeta = getPromiseMeta(target.prototype);

    if (!promiseMeta) {
      promiseMeta = [];
      setPromiseMeta(target.prototype, promiseMeta);
    }
    promiseMeta.push({index, token});
  };
}

export function asLazy(token: IClassInterface<any>): Function {

  return (target: any, key: string, index: number) => {

    let lazyMeta = getLazyMeta(target.prototype);

    if (!lazyMeta) {
      lazyMeta = [];
      setLazyMeta(target.prototype, lazyMeta);
    }
    lazyMeta.push({index, token});
  };
}

export function useFactory(token: Function): Function {

  return (target: any, key: string, index: number) => {

    markAsFactory(token);
    let factoryMeta = getFactoryMeta(target.prototype);

    if (!factoryMeta) {
      factoryMeta = [];
      setFactoryMeta(target.prototype, factoryMeta);
    }
    factoryMeta.push({index, token});
  };
}

export function useToken(token: Function): Function {

  return useFactory(token);
}

export function Provide(token: IClassInterface<any>): Function {

  return (fn: IClassAnnotations) => annotate(fn, new ProvideDecorator(token));
}

export function ProvidePromise(token: IClassInterface<any>): Function {

  return (fn: IClassAnnotations) => annotate(fn, new ProvidePromiseDecorator(token));
}
