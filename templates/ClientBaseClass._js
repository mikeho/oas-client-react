import ClientMiddleware from "../ClientMiddleware";

class ClientBaseClass {
	/**
	 * @method apiMethodCallWithRequest
	 * @async
	 * @param {string} url
	 * @param {string} method
	 * @param [request]
	 * @param {string} [requestType]
	 * @returns {Promise}
	 */
	async executeApiCall(url, method, request, requestType) {
		url = ClientMiddleware.getEndpointUrl() + url;

		const requestOptions = ClientMiddleware.generateRequestOptionsForMethod(method);

		if (request) {
			switch (requestType) {
			case 'json':
				requestOptions.body = JSON.stringify(request);
				requestOptions.headers.append('Content-Type', 'application/json');
				break;
			case 'text':
				requestOptions.body = request;
				requestOptions.headers.append('Content-Type', 'text/plain');
				break;
			case 'form':
				requestOptions.body = request;
				break;
			default:
				throw new Error('unhandled requestType: ' + requestType);
			}
		}

		if (ClientMiddleware.onApiCall) {
			ClientMiddleware.onApiCall(url, method, request, requestType);
		}

		const promise = await fetch(url, requestOptions);

		if (ClientMiddleware.onApiResponse) {
			ClientMiddleware.onApiResponse(url, method, request, requestType);
		}

		return promise;
	}

	/**
	 * @return {string}
	 */
	getEndpointUrl() {
		return ClientMiddleware.getEndpointUrl();
	}

	/**
	 * @param {object} handler
	 * @return {object}
	 */
	generateResponseHandler(handler) {
		const responseHandler = ClientMiddleware.generateDefaultResponseHandler();
		Object.assign(responseHandler, handler);
		return responseHandler;
	}

	/**
	 * Basically a catch-all if the response is a status code that we are not expecting
	 * @param {Response} response
	 * @param {object} responseHandler
	 */
	handleUnhandledResponse(response, responseHandler) {
		response.text()
			.then(responseText => {
				responseHandler.else(response.status, responseText);
			})
			.catch(error => {
				responseHandler.error(error);
			});

	}
}

export default ClientBaseClass;
