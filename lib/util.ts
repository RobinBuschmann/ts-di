// A bunch of helper functions.

export function isUpperCase(char: any): boolean {
  return char.toUpperCase() === char;
}

export function isFunction(value: any): boolean {
  return typeof value === 'function';
}


export function isObject(value: any): boolean {
  return typeof value === 'object';
}


export function toString(token: any): string {
  if (typeof token === 'string') {
    return token;
  }

  if (token === undefined || token === null) {
    return '' + token;
  }

  if (token.name) {
    return token.name;
  }

  return token.toString();
}

export let ownKeys =
  (
    this
    && this.Reflect
    && Reflect.ownKeys ? Reflect.ownKeys : (O: any) => {
        const keys = Object.getOwnPropertyNames(O);

        if (Object.getOwnPropertySymbols)
          return keys.concat(Object.getOwnPropertySymbols(O).toString());

        return keys;
      }
  );
