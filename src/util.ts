// A bunch of helper functions.

function isUpperCase(char: any)
{
  return char.toUpperCase() === char;
}

function isFunction(value: any)
{
  return typeof value === 'function';
}


function isObject(value: any)
{
  return typeof value === 'object';
}


function toString(token: any)
{
  if (typeof token === 'string')
  {
    return token;
  }

  if (token === undefined || token === null)
  {
    return '' + token;
  }

  if (token.name)
  {
    return token.name;
  }

  return token.toString();
}

var ownKeys =
(
  this
  && this.Reflect
  && Reflect.ownKeys ? Reflect.ownKeys : function ownKeys(O: any)
  {
    var keys = Object.getOwnPropertyNames(O);

    if ( Object.getOwnPropertySymbols )
      return keys.concat( Object.getOwnPropertySymbols(O).toString() );
    
    return keys;
  }
);


export {
  isUpperCase,
  isFunction,
  isObject,
  toString,
  ownKeys
};
