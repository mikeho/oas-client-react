var fs = require('fs');
var SwaggerParser = require('@apidevtools/swagger-parser');
var Property = require('./lib/property');

exports.init = function (url, rootPath) {
	const configurationFilePath = rootPath + '/oas-client.json';

	const configuration = [{
		swaggerUrl: url,
		modelsDestination: 'src/js/models',
		clientsDestination: 'src/js/clients',
	}];

	fs.writeFile(configurationFilePath, JSON.stringify(configuration), 'utf8', function (error) {
		if (error) return console.log(error);
		console.log('new configuration saved to oas-client.json');
	});
};

exports.codegen = async function (root) {
	const rootPath = root;
	const configurationFilePath = rootPath + '/oas-client.json';
	rawConfiguration = null;

	try {
		rawConfiguration = fs.readFileSync(configurationFilePath, 'utf8');
	} catch (error) {
		console.log('error: oas-client is not initialized');
		return;
	}

	var json = JSON.parse(rawConfiguration);
	if (!json || (!json.swaggerUrl && !Array.isArray(json))) {
		console.log('error: corrupt or missing oas-client configuration file');
		return;
	}

	const configurationArray = Array.isArray(json) ? json : [json];

	for (index in configurationArray) {
		const configuration = configurationArray[index];

		// Setup Files and Folders for Models
		fs.mkdirSync(rootPath + '/' + configuration.modelsDestination, { recursive: true });
		fs.mkdirSync(rootPath + '/' + configuration.modelsDestination + '/base', { recursive: true });
		fs.mkdirSync(rootPath + '/' + configuration.modelsDestination + '/enum', { recursive: true });

		// Setup Files and Folders for Clients
		fs.mkdirSync(rootPath + '/' + configuration.clientsDestination, { recursive: true });
		fs.mkdirSync(rootPath + '/' + configuration.clientsDestination + '/base', { recursive: true });
		fs.copyFileSync(__dirname + '/templates/ClientBaseClass._js', rootPath + '/' + configuration.clientsDestination + '/base/ClientBaseClass.js');
		fs.copyFileSync(__dirname + '/templates/ClientOptions._js', rootPath + '/' + configuration.clientsDestination + '/base/ClientOptions.js');
		copyFileIfNotExists(__dirname + '/templates/DefaultClientOptions._js', rootPath + '/' + configuration.clientsDestination + '/DefaultClientOptions.js');

		await SwaggerParser.parse(configuration.swaggerUrl, (error, api) => {
			const helper = new CodegenHelper(rootPath, configuration);
			helper.swaggerParser_Parsed(error, api);
		});
	}
};

var copyFileIfNotExists = function (source, destination) {
	try {
		fs.statSync(destination);
	} catch (error) {
		if (error.code === 'ENOENT') {
			// File Does Not Exist -- proceed with the copy
			fs.copyFileSync(source, destination);
		} else {
			// Unknown error -- log to screen
			console.error(error);
			return;
		}
	}
}

class CodegenHelper {
	constructor(rootPath, configuration) {
		this.rootPath = rootPath;
		this.configuration = configuration;
	}

	swaggerParser_Parsed = function (error, api) {
		if (error) {
			console.error(error);
			return;
		}

		// Model
		for (var name in api.definitions) {
			try {
				fs.statSync(this.rootPath + '/' + this.configuration.modelsDestination + '/' + name + '.js');
			} catch (error) {
				if (error.code === 'ENOENT') {
					// File Does Not Exist -- Create It
					this.executeCreateModel(name, api.definitions[name]);
				} else {
					console.error(error);
					return;
				}
			}

			this.executeCreateModelBase(name, api.definitions[name]);
		}

		this.executeCreateAggregateModelBase(api.definitions);

		// Client
		const clientObject = {};

		for (var path in api.paths) {
			for (var method in api.paths[path]) {
				const apiDefinition = api.paths[path][method];
				const operationId = apiDefinition.operationId;

				if (!operationId) {
					console.error(method + " at " + path + " has no operationId");
					return;
				}

				const operationParts = operationId.split('::');

				if (operationParts.length !== 2) {
					console.error(method + " at " + path + " has an invalid operationId: " + operationId);
					return;
				}

				if (!clientObject[operationParts[0]]) {
					clientObject[operationParts[0]] = {}
				}

				clientObject[operationParts[0]][operationParts[1]] = apiDefinition;
				apiDefinition.path = path;
				apiDefinition.method = method;
			}
		}

		for (name in clientObject) {
			this.executeCreateClientBase(name, clientObject[name]);
		}

		this.executeCreateAggregateClientBase(clientObject);
	}

	executeCreateClientBase_Helper = function (method, definition, imports) {
		let parameterJsDocArray = [];
		let parameterSignatureArray = [];
		let urlDefinition = "'" + definition.path + "'";
		let requestPayload = '';
		let requestPayloadSetupFormData = '';
		let requestPayloadSetupQuery = '';

		let isFormData = false;
		let isJsonBody = false;

		if (definition.parameters) {
			definition.parameters.forEach(parameter => {
				let parameterName = '';
				parameter.name.split('_').forEach(token => {
					token = token.trim().toLowerCase();

					if (!token.length) {
						return;
					}

					if (parameterName.length === 0) {
						parameterName = token;
					} else {
						parameterName += token.substring(0, 1).toUpperCase() + token.substring(1);
					}
				})

				let property = null;

				switch (parameter.in) {
					case 'query':
						if (!requestPayloadSetupQuery) {
							requestPayloadSetupQuery = '\n\t\tconst queryArray = [];\n';
						}
						requestPayloadSetupQuery += '\t\tif ((' + parameterName + ' !== undefined) && (' + parameterName + ' !== null) && (' + parameterName + '.length)) ' +
							"queryArray.push('" + parameter.name + "=' + encodeURIComponent(" + parameterName + "));\n";
						property = new Property(parameterName, parameter);
						break;
					case 'formData':
						if (isJsonBody) {
							throw new Error('Cannot have both body and formData in the same request: ' + method);
						}
						isFormData = true;

						if (!requestPayloadSetupFormData.length) {
							requestPayloadSetupFormData = '\n\t\tconst formData = new FormData();\n';
						}
						requestPayloadSetupFormData += "\t\tformData.append('" + parameter.name + "', " + parameterName + ");\n";

						requestPayload = ", formData, 'form'";
						property = new Property(parameterName, parameter);
						break;
					case 'path':
						property = new Property(parameterName, parameter);
						urlDefinition = urlDefinition.replace('{' + parameter.name + '}', "' +\n\t\t\t(" + parameterName + " ? encodeURIComponent(" + parameterName + ") : '') + '");
						break;
					case 'body':
						if (isFormData) {
							throw new Error('Cannot have both body and formData in the same request: ' + method);
						}
						isJsonBody = true;
						requestPayload = ", " + parameterName + ", 'json'";
						property = new Property(parameterName, parameter.schema);
						break;
				}

				parameterJsDocArray.push('\t * @param {' + property.getJsDocType() + '} ' + parameterName + '\n');
				parameterSignatureArray.push(parameterName);
			});
		}

		// Add Query to URL if applicable
		if (requestPayloadSetupQuery.length) {
			urlDefinition += " +\n\t\t\t(queryArray.length ? '?' + queryArray.join('&') : '')";
		}

		// Explicitly Set requestPayloads to null if needed
		if (requestPayload === "") {
			requestPayload = ", null, null";
		}

		let casesArray = [];
		let responseHandlerJsDoc = [];
		for (var statusCode in definition.responses) {
			let type = '';
			let arrayFlag = false;

			let content =
				'\t\t\t\tcase ' + statusCode + ':\n' +
				'\t\t\t\t\tif (responseHandler.status' + statusCode + ') {\n';

			if (definition.responses[statusCode].schema) {
				const property = new Property(null, definition.responses[statusCode].schema);
				type = property.getJsDocType();
				if (type.substring(0, 1) === '[') {
					arrayFlag = true;
					type = type.substring(1, type.length - 1);
				}

				if (type !== 'object') {
					imports[type] = type;
					content +=
						'\t\t\t\t\t\tresponse.json()\n' +
						'\t\t\t\t\t\t\t.then(responseJson => {\n' +
						'\t\t\t\t\t\t\t\tresponseHandler.status' + statusCode + '(' + type + '.' + (arrayFlag ? 'createArray' : 'create') + '(responseJson));\n' +
						'\t\t\t\t\t\t\t})\n' +
						'\t\t\t\t\t\t\t.catch(responseHandler.error);\n' +
						'\t\t\t\t\t\treturn;\n'
				} else {
					content +=
						'\t\t\t\t\t\tresponse.json()\n' +
						'\t\t\t\t\t\t\t.then(responseJson => {\n' +
						'\t\t\t\t\t\t\t\tresponseHandler.status' + statusCode + '(responseJson);\n' +
						'\t\t\t\t\t\t\t})\n' +
						'\t\t\t\t\t\t\t.catch(responseHandler.error);\n' +
						'\t\t\t\t\t\treturn;\n'
				}
			} else {
				type = 'string';
				content +=
					'\t\t\t\t\t\tresponse.text()\n' +
					'\t\t\t\t\t\t\t.then(responseText => {\n' +
					'\t\t\t\t\t\t\t\tresponseHandler.status' + statusCode + '(responseText);\n' +
					'\t\t\t\t\t\t\t})\n' +
					'\t\t\t\t\t\t\t.catch(responseHandler.error);\n' +
					'\t\t\t\t\t\treturn;\n'
			}

			content +=
				'\t\t\t\t\t}\n' +
				'\t\t\t\t\tbreak;\n'


			casesArray.push(content);

			responseHandlerJsDoc.push('status' + statusCode + ': function(' + type + (arrayFlag ? '[]' : '') + '), ');
		}

		// Last Items
		parameterSignatureArray.push('responseHandler');
		parameterSignatureArray.push('options');
		urlDefinition = urlDefinition.replace(" + ''", "");

		// @param {{status200: function(Session), status404: function(string), }} handler

		let content =
			'\t/**\n' +
			'\t * ' + definition.summary + '\n' +
			parameterJsDocArray.join('') +
			'\t * @param {{' + responseHandlerJsDoc.join('') + 'error: function(error), else: function(integer, string)}} responseHandler\n' +
			'\t * @param {ClientOptions|null} options optional overrides on the DefaultClientOptions\n' +
			'\t */\n' +
			'\t' + method + '(' + parameterSignatureArray.join(', ') + ') {\n' +
			'\t\tresponseHandler = this.generateResponseHandler(responseHandler, options);\n' +
			requestPayloadSetupQuery + '\n' +
			'\t\tconst url = ' + urlDefinition + ';\n' +
			requestPayloadSetupFormData + '\n' +
			'\t\t// noinspection Duplicates\n' +
			"\t\tthis.executeApiCall(url, '" + definition.method + "'" + requestPayload + ', options)\n' +
			'\t\t\t.then(response => {\n' +
			'\t\t\t\tswitch (response.status) {\n' +
			casesArray.join('') +
			'\t\t\t\t}\n' +
			'\n' +
			'\t\t\t\t// If we are here, we basically have a response statusCode that we were npt expecting or are not set to handle\n' +
			'\t\t\t\t// Go ahead and fall back to the catch-all\n' +
			'\t\t\t\tthis.handleUnhandledResponse(response, responseHandler);\n' +
			'\t\t\t})\n' +
			'\t\t\t.catch(error => {\n' +
			'\t\t\t\tresponseHandler.error(error);\n' +
			'\t\t\t});\n' +
			'\t}\n';


		return content;
	}

	executeCreateClientBase = function (name, definition) {

		let methods = '';
		let imports = {};
		for (var method in definition) {
			methods += this.executeCreateClientBase_Helper(method, definition[method], imports);
			methods += '\n';
		}

		let importLines = '';
		for (var type in imports) {
			importLines += 'import ' + type + ' from "../../models/' + type + '";\n';
		}

		const content =
			'import ClientBaseClass from "./ClientBaseClass";\n' +
			importLines +
			'\n' +
			'export default class ' + name + ' extends ClientBaseClass {\n' +
			methods +
			'}\n';

		fs.writeFileSync(this.rootPath + '/' + this.configuration.clientsDestination + '/base/' + name + '.js', content);
	}

	executeCreateAggregateClientBase = function (definitions) {
		let importList = '';
		let definitionList = '';

		for (var name in definitions) {
			importList += 'import ' + name + ' from "./' + name + '";\n';
			definitionList += 'Client.' + name + ' = new ' + name + '();\n';
		}

		const content =
			importList +
			'\n' +
			'/**\n' +
			' * Use globally to access any of the API Client Methods for the WebService\n' +
			' */\n' +
			'export default class Client {\n' +
			'}\n' +
			'\n' +
			'/**\n' +
			' * Use in a responseHandler if you want to ignore a given/specific response\n' +
			' */\n' +
			'export function ignoreResponse() {\n' +
			'}\n' +
			'\n' +
			definitionList;

		fs.writeFileSync(this.rootPath + '/' + this.configuration.clientsDestination + '/base/Client.js', content);
	}

	executeCreateAggregateModelBase = function (definitions) {
		let importList = '';
		let switchList = '';

		for (var name in definitions) {
			importList += 'import ' + name + ' from "../' + name + '";\n';
			switchList += "\t\tcase '" + name + "':\n" +
				"\t\t\treturn " + name + ".create(genericObject);\n";
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
			'\t\tdefault:\n' +
			'\t\t\tthrow new Error(\'Undefined model class: \' + className);\n' +
			'\t\t}\n' +
			'\t}\n' +
			'}\n' +
			'\n' +
			'export default ModelProxyClass;\n';

		fs.writeFileSync(this.rootPath + '/' + this.configuration.modelsDestination + '/base/ModelProxyClass.js', content);
	}

	executeCreateModel = function (name, definition) {
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

		fs.writeFileSync(this.rootPath + '/' + this.configuration.modelsDestination + '/' + name + '.js', content);
	}

	generatePropertyList = function (propertyArray) {
		var propertyList = '';
		propertyArray.forEach(property => {
			propertyList += property.getJsDoc();
		});

		return propertyList;
	}

	generatePropertyDeclarationList = function (propertyArray) {
		var declarationList = '';
		propertyArray.forEach(property => {
			declarationList += property.getModelPropertyDeclaration();
		});

		return declarationList;
	}

	generateModelDefinitionList = function (propertyArray) {
		var modelDefinitionList = '';
		propertyArray.forEach(property => {
			modelDefinitionList += property.getModelDefinition();
		});

		return modelDefinitionList;
	}

	generateExtraImportList = function (propertyArray, modelToIgnore) {
		var importList = '';
		var modelMemo = [modelToIgnore];

		function getModelName(property) {
			var modelName = property.definition.$ref.replace('#/definitions/', '');
			return modelName;
		}

		propertyArray.forEach(property => {
			// check whether the property has a model type
			if (property.definition.$ref) {
				var modelName = getModelName(property);
				if (!modelMemo.includes(modelName)) {
					importList += 'import ' + modelName + ' from "../' + modelName + '";\n';
					modelMemo.push(modelName);
				}
			}

			// check whether the property has a model array type
			if (property.definition.type === 'array') {
				if (!property.definition.items) {
					throw new Error('Property ' + this.name + ': array has no items defined');
				}
				var arrayProperty = new Property(property.name, property.definition.items);
				if (arrayProperty.definition.$ref) {
					var modelName = getModelName(arrayProperty)
					if (!modelMemo.includes(modelName)) {
						importList += 'import ' + modelName + ' from "../' + modelName + '";\n';
						modelMemo.push(modelName);
					}
				}
			}

		});

		importList += '\n'

		return importList
	}

	executeCreateModelEnum = function (name, propertyName, propertyDefinition) {
		const enumName = name + propertyName.toUpperCase().substring(0, 1) + propertyName.substring(1) + 'Enum';

		var enumValues = '';

		for (index = 0; index < propertyDefinition.enum.length; index++) {
			const camelCase = propertyDefinition.enum[index];
			const underscoreCase = camelCase.split(/(?=[A-Z])/).join('_').toUpperCase();
			enumValues += '\t' + underscoreCase + ": '" + camelCase + "',\n";
		}

		const content =
			'const ' + enumName + ' = Object.freeze({\n' +
			enumValues +
			'});\n' +
			'\n' +
			'export default ' + enumName + ';\n';

		fs.writeFileSync(this.rootPath + '/' + this.configuration.modelsDestination + '/enum/' + enumName + '.js', content);
	}

	executeCreateModelBase = function (name, definition) {
		if (definition.type !== 'object') {
			throw new Error('Schema definition for ' + name + ' is not of type "object"');
		}

		var propertyArray = new Array();
		var enumConstArray = new Array();
		for (var propertyName in definition.properties) {
			const propertyDefinition = definition.properties[propertyName];
			propertyArray.push(new Property(propertyName, propertyDefinition));

			// If it's an ENUM, we need to generate the ENUM class
			if (propertyDefinition.enum) {
				this.executeCreateModelEnum(name, propertyName, propertyDefinition);
			}

			// If it's an array of ENUM, we need to generate the ENUM class
			if (propertyDefinition.items && propertyDefinition.items.enum) {
				this.executeCreateModelEnum(name, propertyName, propertyDefinition.items);
			}

			// Add a ResultParameter Enum/Const definition, if applicable
			if ((propertyName === 'resultParameter') && propertyDefinition.description) {
				let description = propertyDefinition.description.trim();
				if ((description.substring(0, 1) === '[') && (description.substring(description.length - 1) === ']')) {
					description = description.substring(1, description.length - 1);

					description.split(',').forEach(enumName => {
						enumConstArray.push(
							'/**\n' +
							' * @type {string} OrderBy' + enumName.trim() + '\n' +
							' */\n' +
							name + 'Base.OrderBy' + enumName.trim() + " = '" + enumName.trim().toLowerCase() + "';");
					});
				}
			}
		}

		const content =
			'import ModelBaseClass from "@quasidea/oas-client-react/lib/ModelBaseClass";\n' +
			'import ' + name + ' from "../' + name + '";\n' +
			'import ModelProxyClass from "./ModelProxyClass";\n' +
			this.generateExtraImportList(propertyArray, name) +
			'\n' +
			'/**\n' +
			' * @class ' + name + 'Base\n' +
			' * @extends ModelBaseClass\n' +
			this.generatePropertyList(propertyArray) +
			' */\n' +
			'class ' + name + 'Base extends ModelBaseClass {\n' +
			this.generatePropertyDeclarationList(propertyArray) +
			'\n' +
			'\t/**\n' +
			'\t * Instantiates a new instance of ' + name + ' based on the generic object being passed in (typically from a JSON object)\n' +
			'\t * @param {object} genericObject\n' +
			'\t * @return {' + name + '}\n' +
			'\t */\n' +
			'\tstatic create(genericObject) {\n' +
			'\t\tconst new' + name + ' = new ' + name + '();\n' +
			'\t\tnew' + name + '.instantiate(_modelDefinition, genericObject, ModelProxyClass.createByClassName);\n' +
			'\t\treturn new' + name + ';\n' +
			'\t}\n' +
			'\n' +
			'\t/**\n' +
			'\t * Instantiates a new array of ' + name + ' based on the generic array being passed in (typically from a JSON array)\n' +
			'\t * @param {[object]} genericArray\n' +
			'\t * @return {[' + name + ']}\n' +
			'\t */\n' +
			'\tstatic createArray(genericArray) {\n' +
			'\t\tif (genericArray === null) {\n' +
			'\t\t\treturn null;\n' +
			'\t\t}\n\n' +
			'\t\tconst new' + name + 'Array = [];\n' +
			'\t\tgenericArray.forEach(genericObject => {\n' +
			'\t\t\tnew' + name + 'Array.push(' + name + '.create(genericObject));\n' +
			'\t\t});\n' +
			'\t\treturn new' + name + 'Array;\n' +
			'\t}\n' +
			'}\n' +
			'\n' +
			(enumConstArray.length ? enumConstArray.join('\n\n') + '\n\n' : '') +
			'const _modelDefinition = [\n' +
			this.generateModelDefinitionList(propertyArray) +
			'];\n' +
			'\n' +
			'export default ' + name + 'Base;\n';

		fs.writeFileSync(this.rootPath + '/' + this.configuration.modelsDestination + '/base/' + name + 'Base.js', content);
	}
}
