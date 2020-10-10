/**
 * This is middleware for ALL client API webservice calls.
 * This file is designed to be altered.
 */
export default class ClientMiddleware {
	/**
	 * The root Endpoint URL for all webservice method calls in this Client.
	 * This is designed to be altered.
	 * @return {string}
	 */
	static getEndpointUrl() {
		return 'http://www.domain.localhost';
	}

	/**
	 * The default/initial requestOptions to be sent to any fetch() call.
	 * This is designed to be altered.
	 * @param {string} method
	 * @return {object}
	 */
	static generateRequestOptionsForMethod(method) {
		const requestOptions = {
			method: method,
			credentials: 'same-origin',
			headers: {}
		};

		return requestOptions;
	}

	/**
	 * The default/initial set of response handlers for the response to any fetch() call.
	 * This is designed to be altered.
	 * @return {object}
	 */
	static generateDefaultResponseHandler() {
		const responseHandler = {
			error: error => {
				console.error(error);
			},
			else: (statusCode, responseText) => {
				console.warn('Unhandled API Call response: HTTP Status Code [' + statusCode + ']: [' + responseText + ']');
			}
		};

		return responseHandler;
	}
}
