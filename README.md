[![Build Status](https://travis-ci.org/RobinBuschmann/ts-di.png?branch=master)](https://travis-ci.org/RobinBuschmann/ts-di)

## Dependency Injection

This is a fork of KostyaTretyak's [ts-di](https://github.com/KostyaTretyak/ts-di).

### Install

TODO

## Examples resolve dependency

Inject instance of class `A` for constructor of class `B`:

### Using decorator

```ts
import {Inject} from 'ts-di';

class A{}

// All dependencies in @Inject listed separated by commas
@Inject
class B
{
  constructor(private a: A){}

  getValue()
  {
    console.log(`There should be a instance of class A:`, this.a);
  }
}
```

### Using annotation a function

```ts
import {annotate, InjectDecorator} from 'ts-di';

class A{}

class B
{
  constructor(private a: A){}

  getValue()
  {
    console.log(`There should be a instance of class A:`, this.a);
  }
}

// All dependencies in InjectDecorator listed separated by commas
annotate( B, new InjectDecorator(A) );
```

### Get instance

```ts
import {Injector} from 'ts-di';
import {B} from './path/to/class/B';

let injector = new Injector();

// Instance class B and resolve dependency
let instance = injector.get(B);
```

## Usage decorators

Now supports five decorators:
- For resolving chain dependencies:
  - `@Inject`
    - `@asPromise`
    - `@asLazy`
  - `@InjectPromise`
  - `@InjectLazy`
- For resolving single dependency (useful for testing):
  - `@Provide`
  - `@ProvidePromise`

## Compared to KostyaTretyak's ts-di 
This version uses [reflect-metadata](https://www.npmjs.com/package/reflect-metadata) to store the meta information
provided by the decorators. Another benefit from reflect-metadata is, that `Inject` don't need parameters anymore - 
It now retrieves the dependencies through the `design:paramtypes meta information.