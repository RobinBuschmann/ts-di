import
{
  ProvidePromise
  ,InjectPromise
  ,Inject
  ,TransientScope
  ,InjectDecorator
} from '../annotations';

import {Injector} from '../injector';
import {toBeInstanceOf, toBePromiseLike} from './matchers';


class UserList
{
  someProp: number;
}

// An async provider.
@ProvidePromise(UserList)
class FetchUsers
{
  constructor()
  {
    return Promise.resolve(new UserList);
  }
}

class SynchronousUserList {}

@Inject(UserList)
class UserController
{
  constructor(public list: UserList){}
}

@InjectPromise(UserList)
class SmartUserController
{
  constructor(public promise: UserList){}
}


describe('async', function()
{
  beforeAll(function()
  {
    jasmine.addMatchers
    ({
      toBeInstanceOf: toBeInstanceOf,
      toBePromiseLike: toBePromiseLike
    });
  });

  it('should return a promise', function()
  {
    let injector = new Injector([FetchUsers]);
    let p = injector.getPromise(UserList)
    
    // The trick for TypeScript when we calls custom Jasmine matchers
    let exp: any = expect(p);
    exp.toBePromiseLike();
  });


  it('should throw when instantiating promise provider synchronously', function()
  {
    var injector = new Injector([FetchUsers]);

    expect( () => injector.get(UserList) )
      .toThrowError('Cannot instantiate UserList synchronously. It is provided as a promise!');
  });


  it('should return promise even if the provider is sync', function()
  {
    var injector = new Injector();
    var p = injector.getPromise(SynchronousUserList);

    // The trick for TypeScript when we calls custom Jasmine matchers
    let exp: any = expect(p);
    exp.toBePromiseLike();
  });


  // regression
  it('should return promise even if the provider is sync, from cache', function()
  {
    var injector = new Injector();
    var p1 = injector.getPromise(SynchronousUserList);
    var p2 = injector.getPromise(SynchronousUserList);

    // The trick for TypeScript when we calls custom Jasmine matchers
    let exp: any = expect(p2);
    exp.toBePromiseLike();
  });


  it('should return promise when a dependency is async', done =>
  {
    var injector = new Injector([FetchUsers]);

    injector.getPromise(UserController)
    .then(function(userController)
    {
      // The trick for TypeScript when we calls custom Jasmine matchers
      let exp: any = expect(userController);
      exp.toBeInstanceOf(UserController);

      let exp2: any = expect(userController.list);
      exp2.toBeInstanceOf(UserList);
      done();
    });
  });


  // regression
  it('should return a promise even from parent injector', function()
  {
    var injector = new Injector([SynchronousUserList]);
    var childInjector = injector.createChild([])

    // The trick for TypeScript when we calls custom Jasmine matchers
    let exp: any = expect(childInjector.getPromise(SynchronousUserList));
    exp.toBePromiseLike();
  });


  it('should throw when a dependency is async', function()
  {
    var injector = new Injector([FetchUsers]);

    expect(() => injector.get(UserController))
        .toThrowError('Cannot instantiate UserList synchronously. It is provided as a promise! (UserController -> UserList)');
  });


  it('should resolve synchronously when async dependency requested as a promise', function()
  {
    var injector = new Injector([FetchUsers]);
    var controller = injector.get(SmartUserController);

    // The trick for TypeScript when we calls custom Jasmine matchers
    let exp: any = expect(controller);
    exp.toBeInstanceOf(SmartUserController);

    let exp2: any = expect(controller.promise);
    exp2.toBePromiseLike();
  });


  // regression
/*  it('should not cache TransientScope', done =>
  {
    @TransientScope
    @Inject(UserList)
    class NeverCachedUserController
    {
      constructor(public list: UserList){}
    }

    var injector = new Injector([FetchUsers]);

    injector.getPromise(NeverCachedUserController)
    .then(function(controller1)
    {
      injector.getPromise(NeverCachedUserController)
      .then(function(controller2)
      {
        expect(controller1).not.toBe(controller2);
        done();
      });
    });
  });*/


  it('should allow async dependency in a parent constructor', done =>
  {
    class ChildUserController extends UserController {}

    var injector = new Injector([FetchUsers]);

    injector.getPromise(ChildUserController).then(function(childUserController)
    {
      // The trick for TypeScript when we calls custom Jasmine matchers
      let exp: any = expect(childUserController);
      exp.toBeInstanceOf(ChildUserController);

      let exp2: any = expect(childUserController.list);
      exp2.toBeInstanceOf(UserList);
      done();
    });
  });
});
