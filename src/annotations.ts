import {isFunction} from './util';

// This module contains:
// - built-in annotation classes
// - helpers to read/write annotations


// ANNOTATIONS

/**
* A built-in token.
* Used to ask for pre-injected parent constructor.
* A class constructor can ask for this.
*/
export class SuperConstructor {}

/**
* A built-in scope.
* Never cache.
*/
export class TransientScope {}

export class Inject
{
  tokens: any;
  isPromise: boolean;
  isLazy: boolean;

  constructor(...tokens: any[])
  {
    this.tokens = tokens;
    this.isPromise = false;
    this.isLazy = false;
  }
}

export class InjectPromise extends Inject
{
  constructor(...tokens: any[])
  {
    super();
    this.tokens = tokens;
    this.isPromise = true;
    this.isLazy = false;
  }
}

export class InjectLazy extends Inject
{
  constructor(...tokens: any[])
  {
    super();
    this.tokens = tokens;
    this.isPromise = false;
    this.isLazy = true;
  }
}

export class Provide
{
  token: any;
  isPromise: boolean;

  constructor(...token: any[])
  {
    this.token = token;
    this.isPromise = false;
  }
}

export class ProvidePromise extends Provide
{
  token: any;
  isPromise: boolean;

  constructor(...token: any[])
  {
    super();
    this.token = token;
    this.isPromise = true;
  }
}

export class ClassProvider {}
export class FactoryProvider {}


// HELPERS

export interface Fn
{
  annotations ?: (Inject | Provide)[];
  parameters? : any[]
}

/**
 * Append annotation on a function or class.
 * This can be helpful when not using ES6+.
 */
export function annotate( fn: Fn, annotation: Inject | Provide )
{
  fn.annotations = fn.annotations || [];
  fn.annotations.push(annotation);
}

/**
 * Read annotations on a function or class and return whether given annotation is present.
 */
export function hasAnnotation(fn: Fn, annotationClass: any)
{
  if ( !fn.annotations || fn.annotations.length === 0 )
  {
    return false;
  }

  for (let annotation of fn.annotations)
  {
    if (annotation instanceof annotationClass)
    {
      return true;
    }
  }

  return false;
}


/**
 * Read annotations on a function or class and collect "interesting" metadata.
 * @todo to verify `params` type
 */
export function readAnnotations(fn: Fn)
{
  let collectedAnnotations: {provide: Provide, params: (Provide | Inject)[]} =
  {
    /**
     * Description of the provided value.
     */
    provide:
    {
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

  if ( fn && (typeof fn.annotations === 'object') )
  {
    for (let annotation of fn.annotations)
    {
      if (annotation instanceof Inject)
      {
        annotation.tokens.forEach( (token: any) =>
        {
          collectedAnnotations.params.push({
            token: token,
            isPromise: annotation.isPromise,
            isLazy: annotation.isLazy
          });
        });
      }

      if (annotation instanceof Provide)
      {
        collectedAnnotations.provide.token = annotation.token;
        collectedAnnotations.provide.isPromise = annotation.isPromise;
      }
    }
  }

  // Read annotations for individual parameters.
  if (fn.parameters)
  {
    fn.parameters.forEach((param, idx) =>
    {
      for (let paramAnnotation of param)
      {
        // Type annotation.
        if ( isFunction(paramAnnotation) && !collectedAnnotations.params[idx] )
        {
          collectedAnnotations.params[idx] =
          {
            token: paramAnnotation,
            isPromise: false,
            isLazy: false
          };
        }
        else if (paramAnnotation instanceof Inject)
        {
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

/**
 * Decorator versions of annotation classes
 */
export function inject(...tokens: any[])
{
  return function(fn: Fn)
  {
    annotate(fn, new Inject(...tokens));
  };
}

export function injectPromise(...tokens: any[])
{
  return function(fn: Fn)
  {
    annotate(fn, new InjectPromise(...tokens));
  };
}

export function injectLazy(...tokens: any[])
{
  return function(fn: Fn)
  {
    annotate(fn, new InjectLazy(...tokens));
  };
}

export function provide(...tokens: any[])
{
  return function(fn: Fn)
  {
    annotate(fn, new Provide(...tokens));
  };
}

export function providePromise(...tokens: any[])
{
  return function(fn: Fn)
  {
    annotate(fn, new ProvidePromise(...tokens));
  };
}
