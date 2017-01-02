import {
  hasAnnotation,
  readAnnotations,
  Inject,
  InjectLazy,
  InjectPromise,
  Provide,
  ProvidePromise,
  InjectDecorator,
  annotate
} from '../annotations';
import {Injector} from '../injector';

describe('readAnnotations', function()
{
  it('should read @Provide', function()
  {
    class Bar {}

    @Provide(Bar)
    class Foo {}

    let annotations = readAnnotations(Foo);

    expect(annotations.provide.token).toBe(Bar);
    expect(annotations.provide.isPromise).toBe(false);
  });


  it('should read @ProvidePromise', function()
  {
    class Bar {}

    @ProvidePromise(Bar)
    class Foo {}

    let annotations = readAnnotations(Foo);

    expect(annotations.provide.token).toBe(Bar);
    expect(annotations.provide.isPromise).toBe(true);
  });


  it('should read @Inject', function()
  {
    class One {}
    class Two {}

    @Inject(One, Two)
    class Foo {}

    let annotations = readAnnotations(Foo);

    expect(annotations.params[0].token).toBe(One);
    expect(annotations.params[0].isPromise).toBe(false);
    expect(annotations.params[0].isLazy).toBe(false);

    expect(annotations.params[1].token).toBe(Two);
    expect(annotations.params[1].isPromise).toBe(false);
    expect(annotations.params[1].isLazy).toBe(false);
  });


  it('should read type annotations', function() {
    class One {}
    class Two {}

    class Foo {
      constructor(one: One, two: Two) {}
    }

    annotate( Foo, new InjectDecorator(One, Two) );

    let annotations = readAnnotations(Foo);

    expect(annotations.params[0].token).toBe(One);
    expect(annotations.params[0].isPromise).toBe(false);
    expect(annotations.params[0].isLazy).toBe(false);

    expect(annotations.params[1].token).toBe(Two);
    expect(annotations.params[1].isPromise).toBe(false);
    expect(annotations.params[1].isLazy).toBe(false);
  });

  it('should read stacked @Inject{Lazy, Promise} annotations', function() {
    class One {}
    class Two {}
    class Three {}

    @Inject(One)
    @InjectLazy(Two)
    @InjectPromise(Three)
    class Foo {}

    let annotations = readAnnotations(Foo);

    expect(annotations.params[0].token).toBe(One);
    expect(annotations.params[0].isPromise).toBe(false);
    expect(annotations.params[0].isLazy).toBe(false);

    expect(annotations.params[1].token).toBe(Two);
    expect(annotations.params[1].isPromise).toBe(false);
    expect(annotations.params[1].isLazy).toBe(true);

    expect(annotations.params[2].token).toBe(Three);
    expect(annotations.params[2].isPromise).toBe(true);
    expect(annotations.params[2].isLazy).toBe(false);
  });
});

let injector = new Injector();

let msg = 'this is message from property of class A';

class A
{
  message = msg;
}

describe(`@Inject`, () =>
{
  @Inject(A)
  class B
  {
    message = '';

    constructor(instanceA: A)
    {
      this.message = instanceA.message;
    }
  }

  class Bb{}

  @Inject(B, Bb)
  class C
  {
    message = '';

    constructor(instanceB: B, instanceBb: Bb)
    {
      this.message = instanceB.message;
    }

    getValue = () =>
    {
      return this.message;
    }
  }

  let instanceC = injector.get(C);

  it(`should create instance of C`, () =>
  {
    let obj = (new C (new B (new A), new Bb));

    expect( instanceC.toString() ).toEqual( obj.toString() )
  });

  it(`should not to throw during call C.getValue()`, () =>
  {
    expect(instanceC.getValue).not.toThrow();
  });

  it(`should be not empty`, () =>
  {
    expect( instanceC.getValue().length ).toBeGreaterThan(0)
  });

  it(`should to return message from class A`, () =>
  {
    expect( instanceC.getValue() ).toEqual( msg );
  });

});

describe(`annotate()`, () =>
{
  class B
  {
    message = '';

    constructor(instanceA: A)
    {
      this.message = instanceA.message;
    }
  }

  annotate( B, new InjectDecorator(A) );

  class C
  {
    message = '';

    constructor(instanceB: B)
    {
      this.message = instanceB.message;
    }

    getValue = () =>
    {
      return this.message;
    }
  }

  annotate( C, new InjectDecorator(B) );

  let instanceC = injector.get(C);

  it(`should create instance of C`, () =>
  {
    let obj = (new C (new B (new A)));

    expect( instanceC.toString() ).toEqual( obj.toString() )
  });

  it(`should not to throw during call C.getValue()`, () =>
  {
    expect(instanceC.getValue).not.toThrow();
  });

  it(`should be not empty`, () =>
  {
    expect( instanceC.getValue().length ).toBeGreaterThan(0)
  });

  it(`should to return message from class A`, () =>
  {
    expect( instanceC.getValue() ).toEqual( msg );
  });

});

