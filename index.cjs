'use strict';

var process = require('node:process');
var isWSL = require('is-wsl');
var execa = require('execa');
var path = require('node:path');
var node_url = require('node:url');
var is64bit = require('is64bit');

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
const handler = error => {
	if (error.code === 'ENOENT') {
		throw new Error('Couldn\'t find the termux-api scripts. You can install them with: apt install termux-api');
	}

	throw error;
};

const clipboard$4 = {
	async copy(options) {
		try {
			await execa.execa('termux-clipboard-set', options);
		} catch (error) {
			handler(error);
		}
	},
	async paste(options) {
		try {
			const {stdout} = await execa.execa('termux-clipboard-get', options);
			return stdout;
		} catch (error) {
			handler(error);
		}
	},
	copySync(options) {
		try {
			execa.execaSync('termux-clipboard-set', options);
		} catch (error) {
			handler(error);
		}
	},
	pasteSync(options) {
		try {
			return execa.execaSync('termux-clipboard-get', options).stdout;
		} catch (error) {
			handler(error);
		}
	},
};

const __dirname$2 = path.dirname(node_url.fileURLToPath((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('index.cjs', document.baseURI).href))));

const xsel = 'xsel';
const xselFallback = path.join(__dirname$2, '../fallbacks/linux/xsel');

const copyArguments = ['--clipboard', '--input'];
const pasteArguments = ['--clipboard', '--output'];

const makeError = (xselError, fallbackError) => {
	let error;
	if (xselError.code === 'ENOENT') {
		error = new Error('Couldn\'t find the `xsel` binary and fallback didn\'t work. On Debian/Ubuntu you can install xsel with: sudo apt install xsel');
	} else {
		error = new Error('Both xsel and fallback failed');
		error.xselError = xselError;
	}

	error.fallbackError = fallbackError;
	return error;
};

const xselWithFallback = async (argumentList, options) => {
	try {
		const {stdout} = await execa.execa(xsel, argumentList, options);
		return stdout;
	} catch (xselError) {
		try {
			const {stdout} = await execa.execa(xselFallback, argumentList, options);
			return stdout;
		} catch (fallbackError) {
			throw makeError(xselError, fallbackError);
		}
	}
};

const xselWithFallbackSync = (argumentList, options) => {
	try {
		return execa.execaSync(xsel, argumentList, options).stdout;
	} catch (xselError) {
		try {
			return execa.execaSync(xselFallback, argumentList, options).stdout;
		} catch (fallbackError) {
			throw makeError(xselError, fallbackError);
		}
	}
};

const clipboard$3 = {
	async copy(options) {
		await xselWithFallback(copyArguments, options);
	},
	copySync(options) {
		xselWithFallbackSync(copyArguments, options);
	},
	paste: options => xselWithFallback(pasteArguments, options),
	pasteSync: options => xselWithFallbackSync(pasteArguments, options),
};

const env = {
	LC_CTYPE: 'UTF-8', // eslint-disable-line unicorn/text-encoding-identifier-case
};

const clipboard$2 = {
	copy: async options => execa.execa('pbcopy', {...options, env}),
	async paste(options) {
		const {stdout} = await execa.execa('pbpaste', {...options, env});
		return stdout;
	},
	copySync: options => execa.execaSync('pbcopy', {...options, env}),
	pasteSync: options => execa.execaSync('pbpaste', {...options, env}).stdout,
};

const __dirname$1 = path.dirname(node_url.fileURLToPath((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('index.cjs', document.baseURI).href))));

const binarySuffix = is64bit.is64bitSync() ? 'x86_64' : 'i686';

// Binaries from: https://github.com/Jolg42/windows-clipboard
const windowBinaryPath = path.join(__dirname$1, `../fallbacks/windows/clipboard_${binarySuffix}.exe`);

const clipboard$1 = {
	copy: async options => execa.execa(windowBinaryPath, ['--copy'], options),
	async paste(options) {
		const {stdout} = await execa.execa(windowBinaryPath, ['--paste'], options);
		return stdout;
	},
	copySync: options => execa.execaSync(windowBinaryPath, ['--copy'], options),
	pasteSync: options => execa.execaSync(windowBinaryPath, ['--paste'], options).stdout,
};

const platformLib = (() => {
	switch (process.platform) {
		case 'darwin': {
			return clipboard$2;
		}

		case 'win32': {
			return clipboard$1;
		}

		case 'android': {
			if (process.env.PREFIX !== '/data/data/com.termux/files/usr') {
				throw new Error('You need to install Termux for this module to work on Android: https://termux.com');
			}

			return clipboard$4;
		}

		default: {
			// `process.platform === 'linux'` for WSL.
			if (isWSL) {
				return clipboard$1;
			}

			return clipboard$3;
		}
	}
})();

const clipboard = {};

clipboard.write = async text => {
	if (typeof text !== 'string') {
		throw new TypeError(`Expected a string, got ${typeof text}`);
	}

	await platformLib.copy({input: text});
};

clipboard.read = async () => platformLib.paste({stripFinalNewline: false});

clipboard.writeSync = text => {
	if (typeof text !== 'string') {
		throw new TypeError(`Expected a string, got ${typeof text}`);
	}

	platformLib.copySync({input: text});
};

clipboard.readSync = () => platformLib.pasteSync({stripFinalNewline: false});

module.exports = clipboard;
