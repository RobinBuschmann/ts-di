import {annotate, InjectDecorator, Inject, Injector} from './index.js';

let injector = new Injector();

class A{}

describe(`Using annotation function`, () =>
{
  class B
  {
    constructor(private a: A){}

    getValue = () =>
    {
      return this.a;
    }
  }

  annotate( B, new InjectDecorator(A) );

  let instance = injector.get(B);

  it(`\n + Should create instance of B`, () =>
  {
    let obj = (new B ( new A));

    expect( instance.toString() ).toEqual( obj.toString() )
  });

  it(`\n + Should not to throw during call B.getValue()`, () =>
  {
    expect(instance.getValue).not.toThrow();
  });

  it(`\n + Should not to return instance of A`, () =>
  {
    expect( instance.getValue() ).toEqual( new A );
  });

});

describe(`Using decorator`, () =>
{
  @Inject(A)
  class B
  {
    constructor(private a: A){}

    getValue = () =>
    {
      return this.a;
    }
  }

  let instance = injector.get(B);

  it(`\n + Should create instance of B`, () =>
  {
    let obj = (new B ( new A));

    expect( instance.toString() ).toEqual( obj.toString() )
  });

  it(`\n + Should not to throw during call B.getValue()`, () =>
  {
    expect(instance.getValue).not.toThrow();
  });

  it(`\n + Should not to return instance of A`, () =>
  {
    expect( instance.getValue() ).toEqual( new A );
  });

});


