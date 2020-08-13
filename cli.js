#!/usr/bin/env node

function showHelp() {
	console.log("options:\n" +
		"   oas-client init URL\n" +
		"   oas-client codegen"
	);
}

if (process.argv.length < 3) {
	showHelp();
	return;
}

var module = require("./index");

switch (process.argv[2]) {
	case 'init':
		if (process.argv.length !== 4) {
			showHelp();
			return;
		}
		module.init(process.argv[3]);
		break;

	case 'codegen':
		module.codegen();
		break;

	default:
		showHelp();
		break;
}
