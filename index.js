var fs = require('fs');
var SwaggerParser = require('@apidevtools/swagger-parser');

exports.init = function (url, rootPath) {
	const configurationFilePath = rootPath + '/oas-client.json';

	const configuration = {
		swaggerUrl: url
	};

	fs.writeFile(configurationFilePath, JSON.stringify(configuration), 'utf8', function (error) {
		if (error) return console.log(error);
		console.log('new configuration saved to oas-client.json');
	});
};

exports.codegen = function (rootPath) {
	const configurationFilePath = rootPath + '/oas-client.json';
	rawConfiguration = null;

	try {
		rawConfiguration = fs.readFileSync(configurationFilePath, 'utf8');
	} catch (error) {
		console.log('error: oas-client is not initialized');
		return;
	}

	const configuration = JSON.parse(rawConfiguration);
	if (!configuration || !configuration.swaggerUrl) {
		console.log('error: corrupt or missing oas-client configuration file');
		return;
	}

	SwaggerParser.parse(configuration.swaggerUrl, swaggerParser_Parsed);
};

swaggerParser_Parsed = function(error, api) {
	for (name in api.definitions) {
		console.log(name);
		console.log(api.definitions[name]);
		console.log(typeof api.definitions[name]);
	}
}
