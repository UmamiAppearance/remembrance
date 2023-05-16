# remembrance
Make sure your source and build/dist files are up to date.


## Idea
This little tool was born, when I made a release of a JavaScript project. Everything worked perfectly, all bugs fixed, no linting errors, but I forgot to call one build function. The consequence was a new patch release, only to deliver the updated dist packages. Let's face it. These types of errors is something we humans are really good at.  
  
**remembrance** is a solution to prevent this particular error. It is added to the regular testing routine, and checks whether any dist/build files are not up to date.


## How it works
The testing routine walks through all (user defined) source files and stores the most current modification date. All automatically build distribution files (also provided by the user) must have a modification date, which is even more current, if this is not the case - well - we have an error case and the test fails.


## Installation
```sh
npm install remembrance --save-dev
```


## Usage
Add `remembrance` to the test script in `package.json`. Let's imagine the current test runner is [ava](https://github.com/avajs/ava): the script section may look like this:

```json
"scripts": {
    "test": "remembrance && ava"
}
```

The next step is to create the _json-file_ [`.remembrance.json`](#configuration) in the projects root folder. 


### What about tests during development?
It is probably not a goal to get failed tests because of outdated build files while developing. If **remembrance** sees the `NODE_ENV=production` environment variable, it will not make the test fail but only warn. However, it can be much more convenient to create different test cases for production and development. For instance (assuming _ava_ as the test runner again):

```json
"scripts": {
    "test": "remembrance && ava",
    "test:dev": "ava",
}
```


## Configuration
All configuration can be made by creating the file `.remembrance.json` in the projects root folder. This is a mandatory step, as you have to tell **remembrance** what your source and build/dist files are. The most basic json-file may look like this:

```json
{
    "src": "./index.js",
    "dist": "./dist/**",
}
```

This configuration takes `index.js` as the source file. All files found (that match the extension list) in `./dist` must have a more current modification date or the test will fail. It is possible to specify one file or multiple files as an array as well as complete directories. Relative paths are getting converted into absolute paths apart from that, you can apply a [minimatch pattern](https://github.com/isaacs/minimatch) or an array of patterns.


### List of keys and values for `.remembrance.json`

| key            | default                                   | type                           | effect                                                                                                                                                | required? |
| -------------- |------------------------------------------ |------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| _debug_        | `false`                                   | `Boolean`/`String ("verbose")` | enable debugging information with`true` or `"verbose"`                                                                                                | _no_      |
| _dist_         | `null`                                    | `String`/`String[]`            | pass distribution files as a string/[minimatch-pattern](https://github.com/isaacs/minimatch) (also as a list)                                         | _yes_     | 
| _exclude_      | `null`                                    | `String`/`String[]`            | pass source and/or distribution files as a string/[minimatch-pattern](https://github.com/isaacs/minimatch) (also as a list), which should be excluded | _no_      |
| _extensions_   | `[ "cjs", "js", "map", "mjs", "ts" ]`     | `String[]`                     | only files of the given types are taken into account                                                                                                  | _no_      |
| _includeTests_ | `false`                                   | `Boolean`                      | usually test folders are completely ignored, but this can be disabled by passing `false`                                                              | _no_      |
| _silent_       | `false`                                   | `Boolean`                      | if outdated files are found, it gets logged to the terminal, disable this by passing `true`                                                           | _no_      |
| _src_          | `null`                                    | `String`/`String[]`            | pass source files as a string/[minimatch-pattern](https://github.com/isaacs/minimatch) (also as a list)                                               | _yes_     |
| _tolerance_    | `5000`                                    | `Number` (ms)                  | by default the modification time comparison allows a tolerance of 5000 milliseconds, change it if necessary                                           | _no_     |
| _warnOnly_     | `false` (`true` if `NODE_ENV=production`) | `Boolean`                      | if set to `true` the test will only warn for outdated files, but it will not fail                                                                     | _no_      |


#### Complete `.remembrance.json` Example:
```json
{
    "debug": false,
    "dist": "./dist/**",
    "exclude": "./dist/build-0.1.3-legacy.js",
    "extensions": [ "cjs", "js", "map", "mjs", "ts" ],
    "includeTests": false,
    "silent": false,
    "src": [
        "**/src/**",
        "./index.ts"
    ],
    "tolerance": 5000,
    "warnOnly": false
}
```

## License

[MIT](https://opensource.org/licenses/MIT)

Copyright (c) 2023, UmamiAppearance
