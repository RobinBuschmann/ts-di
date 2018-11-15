# ⚠️ THIS PACKAGE IS DEPRECATED
Please use https://github.com/mgechev/injection-js instead



[![Build Status](https://travis-ci.org/RobinBuschmann/ts-di.png?branch=master)](https://travis-ci.org/RobinBuschmann/ts-di)

## Dependency Injection

di-typescript is a simple dependency injection framework, which is build upon 
[ts-di](https://github.com/KostyaTretyak/ts-di) and 
[angular/di.js](https://github.com/angular/di.js). 

## Install
```
npm install di-typescript --save
```


## Configuration
`tsconfig.json` file needs the following flags:
```
"experimentalDecorators": true,
"emitDecoratorMetadata": true
```

## Usage
### Using `@Inject` and create an instance
The following shows how to inject an instance of `UserService` into the constructor of `App`.
```typescript
import {Inject, Injector} from 'di-typescript';

class UserService{}

@Inject
class App
{
  constructor(protected userService: UserService){}

}

const injector = new Injector();
// resolves UserService by creating an instance or retrieves it, when already exists
const app = injector.get(App); 

```

### Using factories and tokens
If a dependency should not been resolved from a class but a function or a simple value,
`@useFactory` or `@useToken` can be used like: 
```typescript
import {Inject, createToken, useToken, useFactory} from 'di-typescript';

interface IStorage { /* ... */ }
const storage: IStorage = { /* ... */ };
const storageFactory = () => storage;

interface IConfig { /* ... */ }
const configToken = createToken('app.config');

@Inject
class App
{
  constructor(protected userService: UserService,
              @useToken(configToken) protected config: IConfig,
              @useFactory(storageFactory) protected storage: IStorage){}

}

const config: IConfig = { /* ... */ };
const injector = new Injector([{provide: configToken, useValue: config}]);
const app = injector.get(App);

```

### Testing and providing different values for specific tokens
When it comes to testing and further a mock should be injected than the actual service,
this can be achieved as the following.

```typescript

class UserService{}
class UserServiceMock{}

function storageMockFactory() {
  /* ... */
}

@Inject
class App
{
  constructor(protected userService: UserService,
              @useFactory(storageFactory) protected storage: IStorage){}

}

const injector = new Injector([
  {provide: UserService, useClass: UserServiceMock},
  {provide: storageFactory, useFactory: storageMockFactory},
]);
const app = injector.get(App);
```

## Differences between di-typescript and angular/di.js
Compared to [ts-di](https://github.com/KostyaTretyak/ts-di) and [angular/di.js](https://github.com/angular/di.js) 
di-typescript uses [reflect-metadata](https://www.npmjs.com/package/reflect-metadata) 
to store the meta information. A benefit from using reflect-metadata is, that the`Inject` 
decorator don't need parameters anymore. di-typescript retrieves these values
through the `design:paramtypes` meta information provided by typescript instead. Another
features are the `useFactory` annotation and the angular2-like 
`{provide: SomeService, useClass/useValue/useFactory}` syntax when creating an injector.
