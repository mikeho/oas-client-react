class ModelBaseClass {
	/**
	 * @param {string} name
	 * @param {string} type
	 * @return {object}
	 */
	static createModelProperty(name, type) {
		return {
			name: name,
			type: type,
		};
	}

	/**
	 * This is a callback to the code generated ModelProxyClass to ask to create a new model class by name
	 * @callback createByClassNameCallback
	 * @param {string} className
	 * @param {object} genericObject
	 */

	/**
	 * Assuming this is a modelObject subclass, instantiates the values from the generic object being passed in (typically from a JSON object)
	 * @param {[object]} modelDefinition
	 * @param {object} genericObject
	 * @param {createByClassNameCallback} createByClassName
	 */
	instantiate(modelDefinition, genericObject, createByClassName) {
		modelDefinition.forEach(modelProperty => {
			const value = genericObject[modelProperty.name];
			if (value === undefined) {
				return;
			}

			if (value === null) {
				this[modelProperty.name] = null;
			} else {
				this[modelProperty.name] = this.instantiateProperty(modelProperty.type, value, createByClassName);
			}

		});
	}

	/**
	 * Assuming this is a modelObject subclass, instantiates the values from the generic object being passed in (typically from a JSON object)
	 * @param {string} type
	 * @param value
	 * @param {createByClassNameCallback} createByClassName
	 */
	instantiateProperty(type, value, createByClassName) {
		if (value === undefined) {
			return undefined;
		}

		if (value === null) {
			return null;
		}

		if (type.substring(0, 1) === '[') {
			const subType = type.substring(1, type.length - 1);
			if (!Array.isArray(value)) {
				return undefined;
			}

			const arrayToReturn = [];
			value.forEach(item => {
				arrayToReturn.push(this.instantiateProperty(subType, item, createByClassName));
			})

			return arrayToReturn;
		}

		switch (type) {
			case 'string':
				return value;

			case 'datetime':
				return new Date(value);

			case 'float':
				return parseFloat(value);

			case 'integer':
				return parseInt(value);

			case 'boolean':
				return value ? true : false;

			default:
				return createByClassName(type, value);
		}
	}
}

export default ModelBaseClass;
