// copy from https://github.com/sindresorhus/type-fest avoid TS2742

export type PromiseValue<
  PromiseType,
  Otherwise = PromiseType
> = PromiseType extends Promise<infer Value>
  ? { 0: PromiseValue<Value>; 1: Value }[PromiseType extends Promise<unknown>
      ? 0
      : 1]
  : Otherwise

type AsyncFunction = (...args: any[]) => Promise<unknown>

export type AsyncReturnType<Target extends AsyncFunction> = PromiseValue<
  ReturnType<Target>
>
