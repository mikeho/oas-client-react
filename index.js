var fs = require('fs');
var SwaggerParser = require('@apidevtools/swagger-parser');
var Property = require('./lib/property');

var rootPath = null;
var configuration = null;

exports.init = function (url, rootPath) {
	const configurationFilePath = rootPath + '/oas-client.json';

	const configuration = {
		swaggerUrl: url,
		modelsDestination: 'src/js/models',
		clientsDestination: 'src/js/clients',
	};

	fs.writeFile(configurationFilePath, JSON.stringify(configuration), 'utf8', function (error) {
		if (error) return console.log(error);
		console.log('new configuration saved to oas-client.json');
	});
};

exports.codegen = function (root) {
	rootPath = root;
	const configurationFilePath = rootPath + '/oas-client.json';
	rawConfiguration = null;

	try {
		rawConfiguration = fs.readFileSync(configurationFilePath, 'utf8');
	} catch (error) {
		console.log('error: oas-client is not initialized');
		return;
	}

	configuration = JSON.parse(rawConfiguration);
	if (!configuration || !configuration.swaggerUrl) {
		console.log('error: corrupt or missing oas-client configuration file');
		return;
	}

	fs.mkdirSync(rootPath + '/' + configuration.modelsDestination, {recursive: true});
	fs.mkdirSync(rootPath + '/' + configuration.modelsDestination + '/base', {recursive: true});
	fs.mkdirSync(rootPath + '/' + configuration.modelsDestination + '/enum', {recursive: true});

	SwaggerParser.parse(configuration.swaggerUrl, swaggerParser_Parsed);
};

var swaggerParser_Parsed = function(error, api) {
	for (name in api.definitions) {
		try {
			fs.statSync(rootPath + '/' + configuration.modelsDestination + '/' + name + '.js');
		} catch (error) {
			if (error.code === 'ENOENT') {
				// File Does Not Exist -- Create It
				executeCreateModel(name, api.definitions[name]);
			} else {
				console.error(error);
				return;
			}
		}

		executeCreateModelBase(name, api.definitions[name]);
	}

	executeCreateAggregateBase(api.definitions);
}

var executeCreateAggregateBase = function(definitions) {
	let importList = '';
	let switchList = '';

	for (name in definitions) {
		importList += 'import ' + name + ' from "../' + name + '";\n';
		switchList += "\t\t\tcase '" + name + "':\n" +
			"\t\t\t\treturn " + name + ".create(genericObject);\n";
	}

	const content =
		importList +
		'\n' +
		'class ModelProxyClass {\n' +
		'\t/**\n' +
		'\t * Constructs a model-based BaseClass subclass based on the className\n' +
		'\t * @param {string} className\n' +
		'\t * @param {object} genericObject\n' +
		'\t * @return {ModelBaseClass}\n' +
		'\t */\n' +
		'\tstatic createByClassName(className, genericObject) {\n' +
		'\t\tswitch (className) {\n' +
		switchList +
		'\t\t\tdefault:\n' +
		'\t\t\t\tthrow new Error(\'Undefined model class: \' + className);\n' +
		'\t\t}\n' +
		'\t}\n' +
		'}\n' +
		'\n' +
		'export default ModelProxyClass;\n';

	fs.writeFileSync(rootPath + '/' + configuration.modelsDestination + '/base/ModelProxyClass.js', content);
}

var executeCreateModel = function(name, definition) {
	const content = "import " + name + "Base from './base/" + name + "Base';\n" +
		"\n" +
		"/**\n" +
		" * @class " + name + "\n" +
		" * @extends " + name + "Base\n" +
		" */\n" +
		"class " + name + " extends " + name + "Base {\n" +
		"\n" +
		"}\n" +
		"\n" +
		"export default " + name + ";\n";

	fs.writeFileSync(rootPath + '/' + configuration.modelsDestination + '/' + name + '.js', content);
}

var generatePropertyList = function(propertyArray) {
	var propertyList = '';
	propertyArray.forEach(property => {
		propertyList += property.getJsDoc();
	});

	return propertyList;
}

var generateModelDefinitionList = function(propertyArray) {
	var modelDefinitionList = '';
	propertyArray.forEach(property => {
		modelDefinitionList += property.getModelDefinition();
	});

	return modelDefinitionList;
}

var executeCreateModelBase = function(name, definition) {
	if (definition.type !== 'object') {
		throw new Error('Schema definition for ' + name + ' is not of type "object"');
	}

	var propertyArray = new Array();
	for (propertyName in definition.properties) {
		propertyArray.push(new Property(propertyName, definition.properties[propertyName]));
	}

	const content =
		'import ModelBaseClass from "@quasidea/oas-client-react/lib/ModelBaseClass";\n' +
		'import ' + name + ' from "../' + name + '";\n' +
		'import ModelProxyClass from "./ModelProxyClass";\n' +
		'\n' +
		'/**\n' +
		' * @class ' + name + 'Base\n' +
		' * @extends ModelBaseClass\n' +
		generatePropertyList(propertyArray) +
		' */\n' +
		'class ' + name + 'Base extends ModelBaseClass {\n' +
		'\n' +
		'\t/**\n' +
		'\t * Instantiates a new instance of ' + name + ' based on the generic object being passed in (typically from a JSON object)\n' +
		'\t * @param {object} genericObject\n' +
		'\t * @return {' + name + '}\n' +
		'\t */\n' +
		'\tstatic create(genericObject) {\n' +
		'\t\tconst new' + name + ' = new ' + name + '(ModelProxyClass.createByClassName);\n' +
		'\t\tnew' + name + '.instantiate(_modelDefinition, genericObject)\n' +
		'\t\treturn new' + name + ';\n' +
		'\t}\n' +
		'\n' +
		'\t/**\n' +
		'\t * Instantiates a new array of ' + name + ' based on the generic array being passed in (typically from a JSON array)\n' +
		'\t * @param {[object]} genericArray\n' +
		'\t * @return {[' + name + ']}\n' +
		'\t */\n' +
		'\tstatic createArray(genericArray) {\n' +
		'\t\tconst new' + name + 'Array = [];\n' +
		'\t\tgenericArray.forEach(genericObject => {\n' +
		'\t\t\tnew' + name + 'Array.push(' + name + '.create(genericObject));\n' +
		'\t\t});\n' +
		'\t\treturn new' + name + 'Array;\n' +
		'\t}\n' +
		'}\n' +
		'\n' +
		'const _modelDefinition = [\n' +
		generateModelDefinitionList(propertyArray) +
		'];\n' +
		'\n' +
		'export default ' + name + 'Base;\n';

	fs.writeFileSync(rootPath + '/' + configuration.modelsDestination + '/base/' + name + 'Base.js', content);
}
