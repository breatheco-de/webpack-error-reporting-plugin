const transformErrors = require('./core/transformErrors');
const { concat, uniqueBy } = require('./utils');
const fetch = require("node-fetch");

const defaultTransformers = [
  require('./transformers/babelSyntax'),
  require('./transformers/moduleNotFound'),
  require('./transformers/esLintError'),
];

class WebpackReportingPlugin {

    constructor(options){
        options = options || {};
        this.onErrors = options.onErrors;
        this.transformers = concat(defaultTransformers, options.additionalTransformers);
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

    //   if (hasWarnings) {
    //     this.displayErrors(extractErrorsFromStats(stats, 'warnings'), 'warning');
    //   }
    };


    compiler.hooks.done.tap('Hello World Plugin', doneFn);
  }

  displayErrors(errors, severity) {
    const processedErrors = transformErrors(errors, this.transformers);
    console.log(processedErrors);
    //fetch()
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


module.exports = WebpackReportingPlugin;