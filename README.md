# gist-db

Treat your gist account like a database

[![npm downloads](https://img.shields.io/npm/dm/gist-db.svg)](https://www.npmjs.com/package/gist-db)
[![npm version](https://img.shields.io/npm/v/gist-db.svg)](https://www.npmjs.com/package/gist-db)

## Installation

```sh
npm install --save gist-db
```

## Development

1.  Create a personal access token with the `gist` scope:

    https://github.com/settings/tokens/new?scopes=gist

2.  Use [docker](https://docs.docker.com/get-docker) to ensure that a consistent
    versions of node and npm are used:

    ```sh
    # Build the library

    docker run --rm -it \
    -v $(pwd):/usr/src \
    -w /usr/src \
    node:12.13.1-alpine3.10 \
    sh -c "npm install && npx tsc";

    # Run the example

    docker run --rm -it \
    -v $(pwd):/usr/src \
    -w /usr/src \
    -e GITHUB_ACCESS_TOKEN="your access token" \
    node:12.13.1-alpine3.10 \
    node examples/basic-usage.js;

    # Or do both in one go

    docker run --rm -it \
    -v $(pwd):/usr/src \
    -w /usr/src \
    -e GITHUB_ACCESS_TOKEN="your access token" \
    node:12.13.1-alpine3.10 \
    sh -c "npm install && npx tsc && node examples/basic-usage.js";
    ```

## License

[MIT](LICENSE)
