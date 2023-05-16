# remembrance
Make sure your build files are up to date.


## Idea
This little tool was born, when I made a release of a JavaScript project. Everything worked perfectly, all bugs fixed, no linting errors, but I forgot to call one build function. The consequence was a new patch release, only to deliver the updated dist packages. Let's face it. These types of errors is something we humans are really good at.  
  
**remembrance** is a solution to prevent this error. It is added to the regular testing routine, and checks whether any dist/build files are not up to date.

## How it works
The testing routine walks through all source files and stores the most current modification date. All automatically build distribution files must have a modification date, which is even more current, if this is not the case, well we have an error case and the test fails.

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
All configuration can be made by creating the file `.remembrance.json` in the projects root folder. This is a mandatory step, as you have to tell **remembrance** what your source and build/dist files are. The most basic json-file may loom like this:

```json
{
    "src": "./index.js",
    "dist": "./dist/**",
}
```

This configuration takes `index.js` as the source file. All files found (that match the extension list) in `./dist` must have a more current modification date or the test will fail. It is possible to specify one file or multiple files as an array as well as complete directories. Relative paths are getting converted into absolute paths apart from that, you can apply a [minimatch pattern](https://github.com/isaacs/minimatch) or an array of patterns.

### List of keys and values for `.remembrance.json`

| key | value | type | required? |
| --- |------ |----- | --------- |


### config
 * src
 * dist
 * extensions
 * warnOnly
 * silent
 * debug
 * exclude
 * includeTests
 * 