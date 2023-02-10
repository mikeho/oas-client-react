import DefaultClientOptions from "../DefaultClientOptions";

class ClientBaseClass {
	/**
	 * @method apiMethodCallWithRequest
	 * @async
	 * @param {string} url
	 * @param {string} method
	 * @param [request]
	 * @param {string} [requestType]
	 * @param {ClientOptions|null} options
	 * @returns {Promise}
	 */
	async executeApiCall(url, method, request, requestType, options) {
		url = ((options && options.getEndpointUrl) ?
			options.getEndpointUrl() :
			DefaultClientOptions.getEndpointUrl()) + url;

		const requestOptions = (options && options.generateRequestOptionsForMethod) ?
			options.generateRequestOptionsForMethod(method) :
			DefaultClientOptions.generateRequestOptionsForMethod(method);

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

		if (options && (options.onApiCall !== null) && (options.onApiCall !== undefined)) {
			if (options.onApiCall) options.onApiCall(url, method, request, requestType);
		} else if (DefaultClientOptions.onApiCall) {
			DefaultClientOptions.onApiCall(url, method, request, requestType);
		}

		const promise = await fetch(url, requestOptions).catch(error => {
			if (options && (options.onApiResponse !== null) && (options.onApiResponse !== undefined)) {
				if (options.onApiResponse) options.onApiResponse(url, method, request, requestType);
			} else if (DefaultClientOptions.onApiResponse) {
				DefaultClientOptions.onApiResponse(url, method, request, requestType);
			}

			throw error;
		});

		if (options && (options.onApiResponse !== null) && (options.onApiResponse !== undefined)) {
			if (options.onApiResponse) options.onApiResponse(url, method, request, requestType);
		} else if (DefaultClientOptions.onApiResponse) {
			DefaultClientOptions.onApiResponse(url, method, request, requestType);
		}

		return promise;
	}

	/**
	 * @param {object} handler
	 * @param {ClientOptions|null} options
	 * @return {object}
	 */
	generateResponseHandler(handler, options) {
		const responseHandler = (options && options.generateDefaultResponseHandler) ?
			options.generateDefaultResponseHandler() :
			DefaultClientOptions.generateDefaultResponseHandler();
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
