[![Build Status](https://travis-ci.org/KostyaTretyak/ts-di.png?branch=master)](https://travis-ci.org/KostyaTretyak/ts-di)

## Dependency Injection v2

This fork - it's just version TypeScript [Angular di.js](https://github.com/angular/di.js).

### Transpiling

```bash
tsc
```

### Install

```bash
npm install ts-di --save
```

## Examples resolve dependency

Inject instance of class `A` for constructor of class `B`:

### Using annotation a function

```ts
import {annotate, InjectDecorator} from 'ts-di';

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

### Using decorator

```ts
import {Inject} from 'ts-di';

// All dependencies in @Inject listed separated by commas
@Inject(A)
class B
{
  constructor(private a: A){}

  getValue()
  {
    console.log(`There should be a instance of class A:`, this.a);
  }
}
```

### Get instance

```ts
import {Injector} from 'ts-di';

let injector = new Injector();

// Instance class B and resolve dependency
let instance = injector.get(B);
```