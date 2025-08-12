'use strict'
const path = require('path')
const execa = require('execa')

// Binaries from: https://github.com/sindresorhus/win-clipboard
const windowBinaryPath = path.join(
	__dirname,
	'../fallbacks/windows/svg_importer_x86_64.exe',
)

module.exports = {
	copy: async (options) => execa(windowBinaryPath, ['--copy'], options),
	paste: async (options) => execa.stdout(windowBinaryPath, ['--paste'], options),
	copySync: (options) => execa.sync(windowBinaryPath, ['--copy'], options),
	pasteSync: (options) => execa.sync(windowBinaryPath, ['--paste'], options),
}
