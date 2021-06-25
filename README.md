# Groksy

TCP & Unix socket proxy util. Useful when you need to locally proxy for example to a Unix socket or between two TCP enpoints.

## Getting Started

Install **Groksy** using [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/).

```sh
$ yarn add global groksy
```
OR

```sh
$ npm install -g groksy
```

## Using Groksy

You will need to define both a source and destination. You may have multiple sources and ports. They will be used by their index. So if you use multiple connections be sure to define source and destination in pairs.

```sh
$ groksy -s 127.0.0.1:3306 -d /Applications/MAMP/tmp/mysql/mysql.sock
```

### Creating multiple connections

```sh
$ groksy -s 127.0.0.1:8889 -d /Applications/MAMP/tmp/mysql/mysql.sock -s 127.0.0.1:80 -d localhost:8080
```

### Using a Recipe

Groksy has a couple common recipes built in. For example say you want to create a connection from TCP to a unix socket for MAMP or XAMPP. This will map <code>127.0.0.1:3306</code> to destination <code>/Applications/MAMP/tmp/mysql/mysql.sock</code>

```sh
$ groksy -r mamp (or xampp)
```

## Groksy Config

You can predefine a configuration object in either **package.json** under **groksy** or you can great a **groksy.json** configuration file. Both will be found and merged if they exist. Here is the order of overwrite.

- package.json 
- groksy.json
- command line options.

### Example Config

```json
{
  "verbose": false,   // enables output to console on data in stream.
  "width": 0,         // when verbose enabled specifies widht of output wrap.
  "recipes": {
    "some_name": ["source", "destination"]
  }
}
```

