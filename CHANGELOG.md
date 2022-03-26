# [0.8.0](https://github.com/zcong1993/node-redis-cache/compare/v0.8.0-beta.0...v0.8.0) (2022-03-26)

# [0.8.0-beta.0](https://github.com/zcong1993/node-redis-cache/compare/v0.7.3...v0.8.0-beta.0) (2021-12-03)

### Features

- add combineKeyStringer make the cache key obvious for simple type args ([225f1ba](https://github.com/zcong1993/node-redis-cache/commit/225f1ba0a09d09588df858fda35ed27ccbf8678a))

### BREAKING CHANGES

- Hasher is renamed to KeyStringer and md5KeyStringer is renamed to md5KeyStringer, all of those all deprecated in future. The default keyStringer changed to combineKeyStringer.

## [0.7.3](https://github.com/zcong1993/node-redis-cache/compare/v0.7.2...v0.7.3) (2021-10-20)

### Bug Fixes

- debug lib import, bump deps and migrate to pnpm ([314e0d8](https://github.com/zcong1993/node-redis-cache/commit/314e0d81658034c2eef90a589001878298c9efc8))

## [0.7.2](https://github.com/zcong1993/node-redis-cache/compare/v0.7.1...v0.7.2) (2021-08-12)

### Bug Fixes

- release commonjs ([17c6ef1](https://github.com/zcong1993/node-redis-cache/commit/17c6ef1e42265510245817356188b14fad5559b3))

## [0.7.1](https://github.com/zcong1993/node-redis-cache/compare/v0.7.0...v0.7.1) (2021-08-12)

### Bug Fixes

- test type import ([2d51bca](https://github.com/zcong1993/node-redis-cache/commit/2d51bca04e735d73494e4245a9149e43a1d29241))

# [0.7.0](https://github.com/zcong1993/node-redis-cache/compare/v0.6.0...v0.7.0) (2021-08-04)

### Bug Fixes

- sharding ([d7fdf45](https://github.com/zcong1993/node-redis-cache/commit/d7fdf45eb1da4ec9ba68a84f6ae52e6cb288b7ff))

### Features

- support thisArg ([1e8c819](https://github.com/zcong1993/node-redis-cache/commit/1e8c819847c940e677f7dfc36131fa560565f314))

# [0.6.0](https://github.com/zcong1993/node-redis-cache/compare/v0.5.0...v0.6.0) (2021-05-02)

### Bug Fixes

- fix metrics ([1b5b3f4](https://github.com/zcong1993/node-redis-cache/commit/1b5b3f4f2a826b86527736c24d95273a48630e6e))
- hit not found cache placeholder should plus hitCounter ([340b091](https://github.com/zcong1993/node-redis-cache/commit/340b091637ae0e9c37e00aa5f3780ab9a21a3e0d))

### Features

- add clean method ([e16b2b9](https://github.com/zcong1993/node-redis-cache/commit/e16b2b938cdf5b1c7abb57338ff5580dfc6fe8fd))
- add stat ([e918b91](https://github.com/zcong1993/node-redis-cache/commit/e918b919ed521f66362abdf10e58e24bf118092d))
- auto delete invalid cache ([67ae249](https://github.com/zcong1993/node-redis-cache/commit/67ae249f1f4fdd9433655e517979007bde06b417))
- sharding support clean ([e008304](https://github.com/zcong1993/node-redis-cache/commit/e0083048e784d2456eedcc4fafcb191d215b85e0))

# [0.5.0](https://github.com/zcong1993/node-redis-cache/compare/v0.4.0...v0.5.0) (2021-04-13)

### Features

- support sharding ([#6](https://github.com/zcong1993/node-redis-cache/issues/6)) ([bd16e70](https://github.com/zcong1993/node-redis-cache/commit/bd16e705b00c09c4768356768770aab81ad7fd27))

# [0.4.0](https://github.com/zcong1993/node-redis-cache/compare/v0.3.2...v0.4.0) (2021-04-12)

### Features

- add deleteFnCache method ([5ef0af2](https://github.com/zcong1993/node-redis-cache/commit/5ef0af2498297a6cfa43eb6bb46ff948a4a93e35))

## [0.3.2](https://github.com/zcong1993/node-redis-cache/compare/v0.3.1...v0.3.2) (2021-04-01)

## [0.3.1](https://github.com/zcong1993/node-redis-cache/compare/v0.3.0...v0.3.1) (2021-03-29)

# [0.3.0](https://github.com/zcong1993/node-redis-cache/compare/v0.2.1...v0.3.0) (2021-03-28)

### Features

- cache not found ([d696967](https://github.com/zcong1993/node-redis-cache/commit/d696967f02140941fb0961aefe7b1348d0e4d99e))
