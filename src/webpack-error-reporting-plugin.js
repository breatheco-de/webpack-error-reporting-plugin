const transformErrors = require('./core/transformErrors');
const { concat, uniqueBy } = require('./utils');
const fetch = require("node-fetch");
const chalk = require('chalk');

const defaultTransformers = [
  require('./transformers/babelSyntax'),
  require('./transformers/moduleNotFound'),
  require('./transformers/esLintError'),
];

class WebpackErrorReporting {

    constructor(options){
        options = options || {};
        this.transformers = concat(defaultTransformers, options.additionalTransformers);
        this.hookURL = options.hookURL || null;
        this.username = options.username || null;
        this.token = options.token || null;
        this.silent = typeof options.silent == 'undefined' ? true : options.silent;
    }

    apply(compiler) {


        const doneFn = stats => {
            //   this.clearConsole();
            const hasErrors = stats.hasErrors();
            const hasWarnings = stats.hasWarnings();

            if (hasErrors) {
                this.displayErrors(extractErrorsFromStats(stats, 'errors'), 'error');
                return;
            }
        };


        compiler.hooks.done.tap('WebpackErrorReporting Plugin', doneFn);
  }

  displayErrors(errors, severity) {

        const log = (message) => this.silent ? null : console.log(`${chalk.blue('ℹ')} ${chalk.gray('[wrp]')}: ${message}`);

        const processedErrors = transformErrors(errors, this.transformers).map(e => {
            delete e.originalStack;
            e.slug = "webpack_error";
            e.username = this.username;
            e.details = e.webpackError ? e.webpackError.toString() : '';
            delete e.webpackError;
            return e;
        });
        if(!this.hookURL || !this.username){
            console.log(chalk.red(`

            ⚠️ Error in Webpack ErrorReporting's Plugin Configuration
            The hookURL and username has to be specified in the plugin options.

            `));
        }
        else{
            let headers = {'Content-Type': 'application/json'};
            if(this.token){
                log(chalk.blue("Adding authorization headers to the report"));
                headers['Authorization'] = `JWT ${this.token}`;
            }

            log(chalk.blue("Fetching error data to API"));
            fetch(this.hookURL, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(processedErrors)
                })
                .then(resp => {
                    if(resp.status != 200) throw new Error("Reponse status: "+resp.status);
                    else log(chalk.green('You error was successfully reported to: '+this.hookURL));
                })
                .catch(err => {
                    log(chalk.red( `🛑 An error has occurred when reporting the errors to: ${this.hookURL}
           ${err.msg || err}
                    `))
                });
        }
    }
}

function extractErrorsFromStats(stats, type) {
  if (isMultiStats(stats)) {
    const errors = stats.stats
      .reduce((errors, stats) => errors.concat(extractErrorsFromStats(stats, type)), []);
    // Dedupe to avoid showing the same error many times when multiple
    // compilers depend on the same module.
    return uniqueBy(errors, error => error.message);
  }
  return stats.compilation[type];
}

function isMultiStats(stats) {
  return stats.stats;
}


module.exports = WebpackErrorReporting;