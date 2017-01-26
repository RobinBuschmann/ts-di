/**
 * An OpaqueToken is used to provide values that should be injected,
 * but are not classes. This is a concept of angular 2 (But simplified
 * in this framework).
 *
 * For further information see:
 *      https://angular.io/docs/ts/latest/guide/dependency-injection.html#!#dependency-injection-tokens
 *
 * In this di framework an opaque token is a factory function, that,
 * when it gets called, throws an error. So it is necessary to provide
 * a value for instantiation of the target class.
 *
 * @example
 *
 * const configToken = createToken('config.token');
 *
 * @Inject
 * class SomeService {
 *
 *   constructor(@useToken(configToken) config: any) {}
 *
 * }
 *
 *
 * const injector = new Injector({provide: configToken, useValue: { .. }}); // value for config
 * injector.get(SomeService);
 *
 * // the following would throw an error, because no value for config is provided
 * const injector = new Injector();
 * injector.get(SomeService);
 *
 */

/**
 * Creates an opaque token for specified key
 *
 * @param key Key don't has to be unique, it is mostly relevant for displaying meaningful errors
 */
export function createToken(key: string): Function {

  // factory
  return (): never => {

    throw new Error(getErrorMessage(key));
  };
}

/**
 * For testing only
 */
export function getErrorMessage(key: string): string {

  return `No provider defined for key "${key}"`;
}


