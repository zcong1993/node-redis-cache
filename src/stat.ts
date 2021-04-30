export interface Stat {
  requestsCounter: number
  hitCounter: number
  errorsCounter: number
  hitNotFoundCacheCounter: number
}

export const createStat = (): Stat => {
  return {
    requestsCounter: 0,
    hitCounter: 0,
    errorsCounter: 0,
    hitNotFoundCacheCounter: 0,
  }
}
