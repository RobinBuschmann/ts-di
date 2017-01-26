import {InjectDecorator, ProvideDecorator} from "./annotations";

const ANNOTATIONS_META_KEY = 'di:annotations';
const PROMISE_META_KEY = 'di:promise-meta';
const LAZY_META_KEY = 'di:lazy-meta';
const FACTORY_KEY = 'di:factory-meta';
const MARKED_FACTORY_KEY = 'di:marked-factory-meta';

export interface ITokenMeta {

  index: number;
  token: any;
}

/**
 * Returns annotation meta data of target if exists
 */
export function getAnnotations(target: any): Array<InjectDecorator|ProvideDecorator> {

  return Reflect.getMetadata(ANNOTATIONS_META_KEY, target);
}

/**
 * Sets annotation meta data of specified target
 */
export function setAnnotations(target: any,
                               annotations: Array<InjectDecorator|ProvideDecorator>): void {

  Reflect.defineMetadata(ANNOTATIONS_META_KEY, annotations, target);
}

/**
 * Returns promise meta data from specified target
 */
export function getPromiseMeta(target: any): ITokenMeta[] {

  return Reflect.getMetadata(PROMISE_META_KEY, target);
}

/**
 * Sets promise meta data of specified target
 */
export function setPromiseMeta(target: any,
                               meta: ITokenMeta[]): void {

  Reflect.defineMetadata(PROMISE_META_KEY, meta, target);
}

/**
 * Returns lazy meta data from specified target
 */
export function getLazyMeta(target: any): ITokenMeta[] {

  return Reflect.getMetadata(LAZY_META_KEY, target);
}

/**
 * Sets lazy meta data of specified target
 */
export function setLazyMeta(target: any,
                            meta: ITokenMeta[]): void {

  Reflect.defineMetadata(LAZY_META_KEY, meta, target);
}

/**
 * Returns factory meta data from specified target
 */
export function getFactoryMeta(target: any): ITokenMeta[] {

  return Reflect.getMetadata(FACTORY_KEY, target);
}

/**
 * Sets lazy factory data of specified target
 */
export function setFactoryMeta(target: any,
                               meta: ITokenMeta[]): void {

  Reflect.defineMetadata(FACTORY_KEY, meta, target);
}

/**
 * Checks specified fn is a factory or not
 */
export function isFactory(fn: Function): boolean {

  return !!Reflect.getMetadata(MARKED_FACTORY_KEY, fn);
}

/**
 * Marks specified fn as factory
 */
export function markAsFactory(fn: Function): void {

  Reflect.defineMetadata(MARKED_FACTORY_KEY, true, fn);
}


