const { minimatch, Minimatch } = require('minimatch')

module.exports = Object.assign((...args) => minimatch(...args), { default: minimatch, minimatch, Minimatch })
