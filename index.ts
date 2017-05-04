// PUBLIC API

export {
  Injector,
  IValueModule,
  IClassModule,
  IFactoryModule,
  Module
} from './lib/injector';
export {createToken} from './lib/opaqueToken';
export {
  annotate,
  InjectDecorator,
  InjectLazyDecorator,
  InjectPromiseDecorator,
  ProvideDecorator,
  ProvidePromiseDecorator,
  SuperConstructor,
  TransientScope,
  ClassProvider,
  FactoryProvider,
  Inject,
  useFactory,
  useToken,
  asPromise,
  asLazy,
  InjectPromise,
  InjectLazy,
  Provide,
  ProvidePromise
} from './lib/annotations';
