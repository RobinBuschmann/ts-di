/*
beforeAll(function()
{
  jasmine.addMatchers
  ({
    toBeInstanceOf: toBeInstanceOf,
    toBePromiseLike: toBePromiseLike
  });
});
*/

export function toBeInstanceOf()
{
  return {
    compare: function(actual: any, expectedClass: any)
    {
      const pass = typeof actual === 'object' && actual instanceof expectedClass;

      return {
        pass: pass,
        get message()
        {
          if(pass)
          {
            // TODO(vojta): support not.toBeInstanceOf
            throw new Error('not.toBeInstanceOf is not supported!');
          }

          return 'Expected ' + actual + ' to be an instance of ' + expectedClass;
        }
      };
    }
  };
}

export function toBePromiseLike()
{
  return {
    compare: function(actual: any, expectedClass: any)
    {
      const pass = typeof actual === 'object' && typeof actual.then === 'function';

      return {
        pass: pass,
        get message()
        {
          if(pass)
          {
            // TODO(vojta): support not.toBePromiseLike
            throw new Error('not.toBePromiseLike is not supported!');
          }

          return 'Expected ' + actual + ' to be a promise';
        }
      };
    }
  };
}
