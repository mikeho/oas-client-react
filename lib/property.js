function Property(name, definition) {
	this.name = name;
	this.definition = definition;
}

Property.prototype.getJsDocType = function getJsDocType() {
	if (this.definition.$ref) {
		return this.definition.$ref.replace('#/definitions/', '');
	}

	if (!this.definition.type) {
		throw new Error('Property ' + this.name + ': no type defined');
	}

	switch (this.definition.type) {
		case 'string':
			if (this.definition.format) {
				switch (this.definition.format) {
					case 'date':
						return 'DateOnly';
					case 'date-time':
						return 'Date';
				}
			}

			if (this.definition.enum) {
				return this.definition.enum.map(value => "'" + value + "'").join('|');
			}

			return 'string';

		case 'object':
			return 'object';

		case 'number':
		case 'integer':
			return 'number';

		case 'boolean':
			return 'boolean';

		case 'file':
			return 'File';

		case 'array':
			if (!this.definition.items) {
				throw new Error('Property ' + this.name + ': array has no items defined');
			}
			var arrayProperty = new Property(this.name, this.definition.items);
			return '[' + arrayProperty.getJsDocType() + ']';
	}

	throw new Error('Property ' + this.name + ': type "' + this.definition.type + '" is not supported');
}

Property.prototype.getJsDocFormat = function getJsDocFormat() {
	if (this.definition.$ref) {
		return null;
	}

	if (!this.definition.type) {
		throw new Error('Property ' + this.name + ': no type defined');
	}

	switch (this.definition.type) {
		case 'string':
			if (this.definition.format) {
				switch (this.definition.format) {
					case 'date':
						return 'date only';
					case 'date-time':
						return 'date and time';

					default:
						return this.definition.format;
				}
			}
			return null;

		case 'number':
			if (this.definition.format) {
				return this.definition.format;
			}
			return null;

		case 'integer':
			if (this.definition.format) {
				return this.definition.format;
			}
			return 'integer';
	}

	return null;
}

Property.prototype.getModelDefinitionType = function getModelDefinitionType() {
	if (this.definition.$ref) {
		return this.definition.$ref.replace('#/definitions/', '');
	}

	if (!this.definition.type) {
		throw new Error('Property ' + this.name + ': no type defined');
	}

	switch (this.definition.type) {
		case 'string':
			if (this.definition.format) {
				switch (this.definition.format) {
					case 'date':
						return 'date';
					case 'date-time':
						return 'datetime';
				}
			}

			return 'string';

		case 'number':
			return 'float';
		case 'integer':
			return 'integer';
		case 'boolean':
			return 'boolean';

		case 'object':
			return 'object';

		case 'array':
			if (!this.definition.items) {
				throw new Error('Property ' + this.name + ': array has no items defined');
			}
			var arrayProperty = new Property(this.name, this.definition.items);
			return '[' + arrayProperty.getModelDefinitionType() + ']';
	}
}

Property.prototype.getModelDefinition = function getModelDefinition() {
	return "\tModelBaseClass.createModelProperty('" + this.name + "', '" + this.getModelDefinitionType() + "'),\n";
}

Property.prototype.getJsDoc = function getJsDoc() {
	var type = this.getJsDocType();
	var format = this.getJsDocFormat();

	var toReturn = ' * @property {' + type + '} ' + this.name;
	if (format) {
		toReturn += ' (' + format + ')';
	}

	if (this.definition.description) {
		toReturn += ' ' + this.definition.description;
	}

	return toReturn + '\n';
}

Property.prototype.getModelPropertyDeclaration = function getModelPropertyDeclaration() {
	var type = this.getJsDocType();
	var format = this.getJsDocFormat();
	var description = this.definition.description;

	var name = '';

	// check if name contains ._-
	if (this.name.match(/[.-_]/)) {
		name = "'" + this.name + "'";
	} else {
		name = this.name
	}

	var typeStr = '\t * @type {' + type + '} ' + this.name;
	if (format) {
		typeStr += ' (' + format + ')';
	}
	typeStr += '\n';

	var result = '\t/**\n'

	if (description) {
		result += `\t * ${description}\n`
	}

	result += `${typeStr}\t */\n\t${name};\n`;

	return result;
}

module.exports = Property;
