import {expect} from 'chai';
import {
  readAnnotations,
  Inject,
  Provide,
  ProvidePromise,
  InjectDecorator,
  annotate,
  asPromise,
  asLazy, useFactory, useToken
} from '../lib/annotations';
import {Injector, Module} from '../lib/injector';
import {createToken, getErrorMessage} from "../lib/opaqueToken";

describe('readAnnotations', () => {

  it('should read @Provide', () => {
    class Bar {
    }

    @Provide(Bar)
    class Foo {
    }

    const annotations = readAnnotations(Foo);

    expect(annotations.provide.token).to.equal(Bar);
    expect(annotations.provide.isPromise).to.be.false;
  });

  it('should read @ProvidePromise', () => {
    class Bar {
    }

    @ProvidePromise(Bar)
    class Foo {
    }

    const annotations = readAnnotations(Foo);

    expect(annotations.provide.token).to.equal(Bar);
    expect(annotations.provide.isPromise).to.be.true;
  });

  it('should read @Inject', () => {
    class One {
    }
    class Two {
    }

    @Inject
    class Foo {

      constructor(one: One, two: Two) {
      }
    }

    const annotations = readAnnotations(Foo);

    expect(annotations.params[0].token).to.equal(One);
    expect(annotations.params[0].isPromise).to.equal(false);
    expect(annotations.params[0].isLazy).to.equal(false);

    expect(annotations.params[1].token).to.equal(Two);
    expect(annotations.params[1].isPromise).to.equal(false);
    expect(annotations.params[1].isLazy).to.equal(false);
  });

  it('should read type annotations of class and instance', () => {
    class One {
    }
    class Two {
    }

    class Foo {
      constructor(one: One, two: Two) {
      }
    }

    annotate(Foo, new InjectDecorator(One, Two));

    [Foo, injector.get(Foo)].forEach(target => {

      const annotations = readAnnotations(target);

      expect(annotations.params[0].token).to.equal(One);
      expect(annotations.params[0].isPromise).to.equal(false);
      expect(annotations.params[0].isLazy).to.equal(false);

      expect(annotations.params[1].token).to.equal(Two);
      expect(annotations.params[1].isPromise).to.equal(false);
      expect(annotations.params[1].isLazy).to.equal(false);
    });
  });

  it('should read stacked @Inject annotations of class and instance', () => {
    class One {
    }
    class Two {
    }
    class Three {
    }

    @Inject
    class Foo {

      constructor(one: One,
                  @asLazy(Two) two: Two,
                  @asPromise(Three) three: Promise<Three>) {

      }
    }

    [Foo, injector.get(Foo)].forEach(target => {

      const annotations = readAnnotations(target);

      expect(annotations.params[0].token).to.equal(One);
      expect(annotations.params[0].isPromise).to.equal(false);
      expect(annotations.params[0].isLazy).to.equal(false);

      expect(annotations.params[1].token).to.equal(Two);
      expect(annotations.params[1].isPromise).to.equal(false);
      expect(annotations.params[1].isLazy).to.equal(true);

      expect(annotations.params[2].token).to.equal(Three);
      expect(annotations.params[2].isPromise).to.equal(true);
      expect(annotations.params[2].isLazy).to.equal(false);
    });
  });
});

const injector = new Injector();

const msg = 'this is message from property of class A';

class A {
  message = msg;
}

describe(`@Inject`, () => {

  const COOL_VALUE = 'cool';
  const bbFactory = () => new Bb();

  @Inject
  class B {
    message = '';

    constructor(public instanceA: A) {
      this.message = instanceA.message;
    }
  }

  class Bb {
  }

  @Inject
  class C {
    message = '';

    constructor(public instanceB: B,
                dummyA: any,
                @asLazy(Bb) public lazyBb: () => Bb,
                @useFactory(() => COOL_VALUE) public coolValue: string,
                @useFactory(bbFactory) public bbFromFactory: Bb,
                dummyB?: any) {
      this.message = instanceB.message;
    }

    getValue = () => {
      return this.message;
    }
  }

  @Inject
  class D {
    constructor(@useFactory(bbFactory) public bbFromFactory: Bb) {
    }
  }

  const instanceC = injector.get(C);
  const instanceD = injector.get(D);

  it(`should create instance of C`, () => {
    const obj = new C(new B(new A()), '', () => new Bb(), COOL_VALUE, new Bb());

    expect(instanceC.toString()).to.eql(obj.toString());
    expect(instanceC.instanceB).to.be.an.instanceof(B);
    expect(instanceC.coolValue).to.equals(COOL_VALUE);
    expect(instanceC.lazyBb()).to.be.an.instanceof(Bb);
    expect(instanceC.bbFromFactory).to.be.an.instanceof(Bb);
    expect(instanceC.instanceB.instanceA).to.be.an.instanceof(A);
  });

  it(`should not to throw during call C.getValue()`, () => {
    expect(instanceC.getValue).not.to.throw();
  });

  it(`should be not empty`, () => {
    expect(instanceC.getValue().length).to.be.greaterThan(0);
  });

  it(`should to return message from class A`, () => {
    expect(instanceC.getValue()).to.eql(msg);
  });

  it(`should cache factory data`, () => {

    expect(instanceC.bbFromFactory === instanceD.bbFromFactory).to.be.true;
  });

});

describe(`useClass, useFactory, useValue`, () => {

  class A {
  }
  class AMock {
  }

  class B {
    source = 'origin';
  }
  const bMock: B = {source: 'bMock'};

  class C {
    source = 'origin';
  }
  const cMock: C = {source: 'cMock'};
  const cMockFactory: (() => C) = () => cMock;

  const prodConfig = 'prod';
  const configToken = createToken('config.token');

  @Inject
  class Service {

    constructor(public a: A,
                public b: B,
                public c: C,
                @useToken(configToken) public config: string) {

    }
  }

  const modules: Module[] = [
    {provide: A, useClass: AMock},
    {provide: B, useValue: bMock},
    {provide: C, useFactory: cMockFactory},
  ];

  it(`should should throw an error`, () => {
    const _injector = new Injector(modules);

    expect(() => _injector.get(Service)).to.throw(getErrorMessage('config.token'));
  });

  it(`should use mock data`, () => {

    modules.push({provide: configToken, useValue: prodConfig});

    const _injector = new Injector(modules);
    const service = _injector.get(Service);

    expect(service.a).to.be.an.instanceof(AMock);
    expect(service.b).to.be.equal(bMock);
    expect(service.c).to.be.equal(cMock);
    expect(service.config).to.be.equal(prodConfig);
  });

});

describe(`annotate()`, () => {
  class B {
    message = '';

    constructor(instanceA: A) {
      this.message = instanceA.message;
    }
  }

  annotate(B, new InjectDecorator(A));

  class C {
    message = '';

    constructor(instanceB: B) {
      this.message = instanceB.message;
    }

    getValue = () => {
      return this.message;
    }
  }

  annotate(C, new InjectDecorator(B));

  const instanceC = injector.get(C);

  it(`should create instance of C`, () => {
    const obj = new C(new B(new A()));

    expect(instanceC.toString()).to.eql(obj.toString());
  });

  it(`should not to throw during call C.getValue()`, () => {
    expect(instanceC.getValue).not.to.throw();
  });

  it(`should be not empty`, () => {
    expect(instanceC.getValue().length).to.be.greaterThan(0);
  });

  it(`should to return message from class A`, () => {
    expect(instanceC.getValue()).to.eql(msg);
  });

});

