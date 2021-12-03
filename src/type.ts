type AsyncFunction = (...args: any[]) => Promise<unknown>

export type AsyncReturnType<Target extends AsyncFunction> = Awaited<
  ReturnType<Target>
>
