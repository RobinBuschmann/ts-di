import {expect} from 'chai';
import {
  ProvidePromise,
  InjectPromise,
  Inject,
  TransientScope,
  InjectDecorator, asPromise
} from '../annotations';
import {Injector} from '../injector';


class UserList {
  someProp: number;
}

// An async provider.
@ProvidePromise(UserList)
class FetchUsers {
  constructor() {
    return Promise.resolve(new UserList());
  }
}

class SynchronousUserList {
}

@Inject
class UserController {
  constructor(public list: UserList) {
  }
}

@InjectPromise(UserList)
class SmartUserController {
  constructor(public promise: Promise<UserList>) {
  }

}
@Inject
class SmartUserListController {
  constructor(@asPromise(UserList) public promise: Promise<UserList>) {
  }
}


describe('async', () => {

  it('should return a promise', () => {
    const injector = new Injector([FetchUsers]);
    const p = injector.getPromise(UserList);

    // The trick for TypeScript when we calls custom Jasmine matchers
    // expect(p).to.be.;
  });


  it('should throw when instantiating promise provider synchronously', () => {
    const injector = new Injector([FetchUsers]);

    expect(() => injector.get(UserList))
      .to.throw('Cannot instantiate UserList synchronously. It is provided as a promise!');
  });


  it('should return promise even if the provider is sync', () => {
    const injector = new Injector();
    const p = injector.getPromise(SynchronousUserList);

    expect(p).to.be.an.instanceof(Promise);
  });


  // regression
  it('should return promise even if the provider is sync, from cache', () => {
    const injector = new Injector();
    const p1 = injector.getPromise(SynchronousUserList);
    const p2 = injector.getPromise(SynchronousUserList);

    expect(p1).to.be.an.instanceof(Promise);
    expect(p2).to.be.an.instanceof(Promise);
  });


  it('should return promise when a dependency is async', () =>

    new Injector([FetchUsers]).getPromise(UserController)
      .then((userController) => {

        expect(userController).to.be.an.instanceof(UserController);
        expect(userController.list).to.be.an.instanceof(UserList);
      })
  );


  // regression
  it('should return a promise even from parent injector', () => {
    const injector = new Injector([SynchronousUserList]);
    const childInjector = injector.createChild([]);

    expect(childInjector.getPromise(SynchronousUserList)).to.be.an.instanceof(Promise);
  });


  it('should throw when a dependency is async', () => {
    const injector = new Injector([FetchUsers]);

    expect(() => injector.get(UserController))
      .to.throw('Cannot instantiate UserList synchronously. It is provided as a promise! (UserController -> UserList)');
  });


  it('should resolve synchronously when async dependency requested as a promise', () => {
    const injector = new Injector([FetchUsers]);
    const controller = injector.get(SmartUserController);
    const listController = injector.get(SmartUserListController);

    expect(controller).to.be.an.instanceof(SmartUserController);
    expect(controller.promise).to.be.an.instanceof(Promise);

    expect(listController).to.be.an.instanceof(SmartUserListController);
    expect(listController.promise).to.be.an.instanceof(Promise);
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


  it('should allow async dependency in a parent constructor', () => {
    class ChildUserController extends UserController {}
    const injector = new Injector([FetchUsers]);

    return injector.getPromise(ChildUserController).then((childUserController) => {

      expect(childUserController).to.be.an.instanceof(ChildUserController);
      expect(childUserController.list).to.be.an.instanceof(UserList);
    });
  });
});
