import 'reflect-metadata';
import {isFunction} from './util';

// This module contains:
// - built-in annotation classes
// - helpers to read/write annotations

const ANNOTATIONS_META_KEY = 'di:annotations';
const PROMISE_META_KEY = 'di:promise-meta';
const LAZY_META_KEY = 'di:lazy-meta';

export interface IClassInterface<T> {
  new (...params: any[]): T;
}

interface ITokenMeta {

  index: number;
  token: any;
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
 * Returns annotation meta data of target if exists
 */
function getAnnotations(target: any): Array<InjectDecorator|ProvideDecorator> {

  return Reflect.getMetadata(ANNOTATIONS_META_KEY, target);
}

/**
 * Sets annotation meta data of specified target
 */
function setAnnotations(target: any,
                        annotations: Array<InjectDecorator|ProvideDecorator>): void {

  Reflect.defineMetadata(ANNOTATIONS_META_KEY, annotations, target);
}

/**
 * Returns promise meta data from specified target
 */
function getPromiseMeta(target: any): ITokenMeta[] {

  return Reflect.getMetadata(PROMISE_META_KEY, target);
}

/**
 * Sets promise meta data of specified target
 */
function setPromiseMeta(target: any,
                        meta: ITokenMeta[]): void {

  Reflect.defineMetadata(PROMISE_META_KEY, meta, target);
}

/**
 * Returns lazy meta data from specified target
 */
function getLazyMeta(target: any): ITokenMeta[] {

  return Reflect.getMetadata(LAZY_META_KEY, target);
}

/**
 * Sets lazy meta data of specified target
 */
function setLazyMeta(target: any,
                     meta: ITokenMeta[]): void {

  Reflect.defineMetadata(LAZY_META_KEY, meta, target);
}

/**
 * Append annotation on a function or class.
 * This can be helpful when not using ES6+.
 */
export function annotate(target: any,
                         annotation: InjectDecorator | ProvideDecorator): void {

  let annotations = getAnnotations(target.prototype);

  if (!annotations) {

    annotations = [annotation];
    setAnnotations(target.prototype, annotations);
  } else {

    annotations.unshift(annotation);
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

  if (target.parameters)
    target.parameters.forEach(readIndividualParams);

  return collectedAnnotations;

  /**
   * Read annotations for individual parameters.
   */
  function readIndividualParams(param: any, idx: number): any {

    for (const paramAnnotation of param) {
      // Type annotation.
      if (isFunction(paramAnnotation) && !collectedAnnotations.params[idx]) {

        collectedAnnotations.params[idx] = {
          token: paramAnnotation,
          isPromise: false,
          isLazy: false
        };

      } else if (paramAnnotation instanceof InjectDecorator) {

        collectedAnnotations.params[idx] = {
          token: paramAnnotation.tokens[0],
          isPromise: paramAnnotation.isPromise,
          isLazy: paramAnnotation.isLazy
        };
      }
    }
  }
}

/**
 * Decorator versions of annotation classes
 */
export function Inject(target: any): void {

  let tokens: any[] = Reflect.getMetadata("design:paramtypes", target) || [];
  const promiseMeta = getPromiseMeta(target.prototype);
  const lazyMeta = getLazyMeta(target.prototype);

  if (promiseMeta) {
    const asPromiseTokens: any[] = promiseMeta.map(meta => meta.token);
    tokens = tokens.filter((token, index) => !promiseMeta.find(meta => meta.index === index));

    annotate(target, new InjectPromiseDecorator(...asPromiseTokens));
  }

  if (lazyMeta) {
    const asLazyTokens: any[] = lazyMeta.map(meta => meta.token);
    tokens = tokens.filter((token, index) => !lazyMeta.find(meta => meta.index === index));

    annotate(target, new InjectLazyDecorator(...asLazyTokens));
  }

  annotate(target, new InjectDecorator(...tokens));
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

export function Provide(token: IClassInterface<any>): Function {

  return (fn: IClassAnnotations) => annotate(fn, new ProvideDecorator(token));
}

export function ProvidePromise(token: IClassInterface<any>): Function {

  return (fn: IClassAnnotations) => annotate(fn, new ProvidePromiseDecorator(token));
}
