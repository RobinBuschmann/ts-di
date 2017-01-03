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
    
    expect(p).toBePromiseLike();
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

    expect(p).toBePromiseLike();
  });


  // regression
  it('should return promise even if the provider is sync, from cache', function()
  {
    var injector = new Injector();
    var p1 = injector.getPromise(SynchronousUserList);
    var p2 = injector.getPromise(SynchronousUserList);

    expect(p2).toBePromiseLike();
  });


  it('should return promise when a dependency is async', done =>
  {
    var injector = new Injector([FetchUsers]);

    injector.getPromise(UserController)
    .then(function(userController) {
      expect(userController).toBeInstanceOf(UserController);
      expect(userController.list).toBeInstanceOf(UserList);
      done();
    });
  });


  // regression
  it('should return a promise even from parent injector', function()
  {
    var injector = new Injector([SynchronousUserList]);
    var childInjector = injector.createChild([])

    expect(childInjector.getPromise(SynchronousUserList)).toBePromiseLike();
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

    expect(controller).toBeInstanceOf(SmartUserController);
    expect(controller.promise).toBePromiseLike();
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
      expect(childUserController).toBeInstanceOf(ChildUserController);
      expect(childUserController.list).toBeInstanceOf(UserList);
      done();
    });
  });
});
