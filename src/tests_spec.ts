import {annotate, InjectDecorator, Inject, Injector} from './index.js';

let injector = new Injector();

let msg = 'this is message from property of class A';

class A
{
  message = msg;
}

describe(`Using decorator`, () =>
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

  @Inject(B)
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

  let instanceC = injector.get(C);

  it(`\n + Should create instance of C`, () =>
  {
    let obj = (new C (new B (new A)));

    expect( instanceC.toString() ).toEqual( obj.toString() )
  });

  it(`\n + Should not to throw during call C.getValue()`, () =>
  {
    expect(instanceC.getValue).not.toThrow();
  });

  it(`\n + Should be not empty`, () =>
  {
    expect( instanceC.getValue().length ).toBeGreaterThan(0)
  });

  it(`\n + Should to return message from class A`, () =>
  {
    expect( instanceC.getValue() ).toEqual( msg );
  });

});

describe(`Using annotation function`, () =>
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

  it(`\n + Should create instance of C`, () =>
  {
    let obj = (new C (new B (new A)));

    expect( instanceC.toString() ).toEqual( obj.toString() )
  });

  it(`\n + Should not to throw during call C.getValue()`, () =>
  {
    expect(instanceC.getValue).not.toThrow();
  });

  it(`\n + Should be not empty`, () =>
  {
    expect( instanceC.getValue().length ).toBeGreaterThan(0)
  });

  it(`\n + Should to return message from class A`, () =>
  {
    expect( instanceC.getValue() ).toEqual( msg );
  });

});

