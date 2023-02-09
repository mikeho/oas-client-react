class ClientOptions {
	/**
	 * The root Endpoint URL for all webservice method calls in this Client.
	 * @method getEndpointUrl
	 * @return {string}
	 */
	getEndpointUrl = null;

	/**
	 * The default/initial requestOptions to be sent to any fetch() call.
	 * @method generateRequestOptionsForMethod
	 * @param {string} method
	 * @return {object}
	 */
	generateRequestOptionsForMethod = null;

	/**
	 * This method is called on EVERY API call.
	 * @method onApiCall
	 * @param {string} url
	 * @param {string} method
	 * @param [request]
	 * @param {string} [requestType]
	 */
	onApiCall = null;

	/**
	 * This method is called on EVERY API response.
	 * @method onApiResponse
	 * @param {string} url
	 * @param {string} method
	 * @param [request]
	 * @param {string} [requestType]
	 */
	onApiResponse = null;

	/**
	 * The default/initial set of response handlers for the response to any fetch() call.
	 * @method generateDefaultResponseHandler
	 * @return {object}
	 */
	generateDefaultResponseHandler = null;
}

export default ClientOptions;
