import {toString} from './util';
import {Injector} from './injector';


let IS_DEBUG = false;
let _global: any = null;

if (typeof process === 'object' && process.env) {
  // Node.js
  IS_DEBUG = !!process.env['DEBUG'];
  _global = global;
} else if (typeof location === 'object' && location.search) {
  // Browser
  IS_DEBUG = /di_debug/.test(location.search);
  _global = window;
}


let globalCounter = 0;
const getUniqueId = () => ++globalCounter;


function serializeToken(token: any, tokens: any): string {
  if (!tokens.has(token)) {
    tokens.set(token, getUniqueId().toString());
  }

  return tokens.get(token);
}

function serializeProvider(provider: any, key: string, tokens: any): any {
  return {
    id: serializeToken(key, tokens),
    name: toString(key),
    isPromise: provider.isPromise,
    dependencies: provider.params.map((param: any) => {
      return {
        token: serializeToken(param.token, tokens),
        isPromise: param.isPromise,
        isLazy: param.isLazy
      };
    })
  };
}


function serializeInjector(injector: any, tokens: any, Injector: Injector): any {
  const serializedInjector: any = {
    id: serializeToken(injector, tokens),
    parent_id: injector._parent ? serializeToken(injector._parent, tokens) : null,
    providers: {}
  };

  const injectorClassId = serializeToken(Injector, tokens);
  serializedInjector.providers[injectorClassId] = {
    id: injectorClassId,
    name: toString(Injector),
    isPromise: false,
    dependencies: []
  };

  injector._providers.forEach((provider: any, key: string) => {
    const serializedProvider = serializeProvider(provider, key, tokens);
    serializedInjector.providers[serializedProvider.id] = serializedProvider;
  });

  return serializedInjector;
}


export function profileInjector(injector: Injector, Injector: any): void {
  if (!IS_DEBUG) {
    return;
  }

  if (!_global.__di_dump__) {
    _global.__di_dump__ = {
        injectors: [],
        tokens: new Map()
      };
  }

  _global.__di_dump__.injectors.push(serializeInjector(injector, _global.__di_dump__.tokens, Injector));
}
