# Opentrons Desktop App

[![JavaScript Style Guide][style-guide-badge]][style-guide]

[Download][] | [Support][]

## overview

The Opentrons desktop application lets you use and configure your [Opentrons personal pipetting robot][robots]. This directory contains the application's UI source code. If you're looking for support or to download the app, please click one of the links above.

This desktop application is built with [Electron][]. You can find the Electron wrapper code in the [`app-shell`](../app-shell) directory.

## developing

To get started: clone the Opentrons/opentrons repository, set up your computer for development as specified in the [project readme][project-readme-setup], and then:

``` shell
# prerequisite: install dependencies as specified in project setup
make install
# change into the app directory
cd app
# install flow-types for testing in development
make install-types
# launch the dev server / electron app in dev mode
make dev
```

At this point, the Electron app will be running with [HMR][] and various Chrome devtools enabled. The app and dev server look for the following environment variables (defaults set in Makefile):

 variable   | default      | description
----------- | ------------ | -------------------------------------------------
 `NODE_ENV` | `production` | Run environment: production, development, or test
 `DEBUG`    | unset        | Runs the app in debug mode
 `PORT`     | `8090`       | Development server port

**Note:** you may want to be running the Opentrons API in a different terminal while developing the app. Please see [project readme][project-readme-server] for API specific instructions.

## stack and structure

The UI stack is built using:

*   [React][]
*   [Redux][]
*   [CSS modules][css-modules]
*   [Babel][]
*   [Webpack][]

Some important directories:

*   `app/src` — Client-side React app run in Electron's [renderer process][electron-renderer]
*   `app/src/rpc` - Opentrons API RPC client (see `api/opentrons/server`)
*   `app/webpack` - Webpack configuration helpers

## testing, type checking, and linting

To run tests:

*   `make test` - Run all tests (including Flow type checking) and then lints
*   `make test-unit` - Run all unit tests

Test tasks can also be run with the following arguments:

 arg   | default | description             | example
------ | ------- | ----------------------- | -----------------------------------
 watch | false   | Run tests in watch mode | `$ make test-unit watch=true`
 cover | !watch  | Calculate code coverage | `$ make test watch=true cover=true`

To lint JS (with [standard][]) and CSS (with [stylelint][]):

*   `make lint` - Lint both JS and CSS
*   `make lint-js` - Lint JS
*   `make lint-css` - List CSS

Lint tasks can also be run with the following arguments:

 arg  | default | description                   | example
----- | ------- | ----------------------------- | -------------------------
 fix  | false   | Automatically fix lint errors | `$ make lint-js fix=true`

To check types with Flow:

*   `make check`

## building

If you'd like to build the Electron desktop app, see the [app shell's build instructions][app-shell-readme-build].

The UI bundle can be built by itself with:

```shell
# default target is "clean dist"
make
# build without cleaning
make dist
```

The UI build process looks for the following environment variables:

 variable   | default      | description
----------- | ------------ | ---------------------------------------------------
 `NODE_ENV` | `production` | Build environment: production, development, or test
 `ANALYZER` | unset        | Launches the [bundle analyzer][bundle-analyzer]

For example, if you wanted to analyze the production JS bundle:

```shell
ANALYZER=true make
```

[style-guide]: https://standardjs.com
[style-guide-badge]: https://img.shields.io/badge/code_style-standard-brightgreen.svg?style=flat-square&maxAge=3600

[download]: http://opentrons.com/ot-app
[support]: https://support.opentrons.com/getting-started#software-setup
[robots]: http://opentrons.com/robots
[project-readme-setup]: ../README.md#set-up-your-development-environment
[project-readme-server]: ../README.md#start-the-opentrons-api
[app-shell-readme-build]: ../app-shell/README.md#building
[electron]: https://electron.atom.io/
[electron-renderer]: https://electronjs.org/docs/tutorial/quick-start#renderer-process
[hmr]: https://webpack.js.org/concepts/hot-module-replacement/
[react]: https://facebook.github.io/react/
[redux]: http://redux.js.org/
[css-modules]: https://github.com/css-modules/css-modules
[babel]: https://babeljs.io/
[webpack]: https://webpack.js.org/
[standard]: https://standardjs.com/
[stylelint]: https://stylelint.io/
[bundle-analyzer]: https://github.com/th0r/webpack-bundle-analyzer
