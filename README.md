About the OAS Client for JavaScript/React
-----------------------------------------

This library provides the ability to code-generate a fully featured Swagger (a.k.a. Open API Specification) client codebase for JavaScript/React.

In a standard Swagger file, you have the following:

* **paths**: defines all of the API webservice methods
* **definitions**: defines all of the schemas that are used as input parameters and/or output responses for the API API webservice methods 

This library is able to code-generate all of the **paths** and **definitions** into **Clients** and **Models** for use in your JavaScript/React-based application.

* **Clients**: standard JavaScript methods that match 1-to-1 with each **path**, using standard JavaScript primitives and objects as your input parameters and response data passed to your callbacks
* **Models**: standard JavaScript classes that match 1-to-1 with each **definition**, allowing for strongly typed request and response objects


Quick Installation
------------------
Begin by installing the package through NPM.

```
npm install @quasidea/oas-client-react
```

Run the command line installer for the OAS Client

```
npx oas-client install URL
```

where URL is the URL of the swagger file that your application will be the client of.

This command will create a `oas-client.json` settings file that contains the following three properties:

* `swaggerUrl`: the URL of the swagger file that you specified above
* `clientsDestination`: the relative folder path that you want to save your code-generated **Clients**
* `modelsDestination`: the relative folder path that you want to save your code-generated **Models**

While you can feel free to edit this file, it's recommended that you only make edits prior to your first run of your code generator.

And then to actually run the code generator itself:

```
npx oas-client codegen
```

The Code Generator
------------------

The OAS Client code generator will generate files into the folders defined as `clientsDestination` and `modelsDestination` in your `oas-client.json` settings file.

The **Clients** folder contains:

* `ClientMiddleware.js`: this is where you can define specific behaviors for all of your Client API calls.  This file is **designed** to be edited.
* `base/Client.js`: this is a simple proxy/accessor class that allows easy access to all of your Client APIs.  This file is **NOT** meant to be edited (any subsequent runs of the code generator will *ovewrite* any manual changes).
* `base/*.js`: the other files are the individual Client APIs as defined in the Swagger file.  These files are **NOT** meant to be edited (any subsequent runs of the code generator will *ovewrite* any manual changes).

The **Models** folder contains:

* `*.js`: the top level folder contains the individual superclasses for each of the Models as defined in the Swagger file.  These files all inherit from their respective base classes.  While these superclasses are initially empty, it is designed to hold any customization you wish to make on the Model classes.  These file are **designed** to be edited.
* `base/*.js`: this contains the individual code-generated subclass for each of the Models as defined in the Swagger file.  These files are **NOT** meant to be edited (any subsequent runs of the code generator will *ovewrite* any manual changes).
* `enum/*.js`: if any ENUMs are defined in the Swagger, each ENUM will be defined here.  It is recommended that these enum object properties be used instead of text strings, so that any linting tools can be used to detect errors/issues.  These files are **NOT** meant to be edited (any subsequent runs of the code generator will *ovewrite* any manual changes).

Client API Call Workflow
------------------------

Each code-generated client method uses the JavaScript-standard Fetch API to make the HTTP requests to the server.  The method names and the Client API that it belongs to is defined by the `operationId` property defined in each method in the Swagger.

Assuming you have a path defined your swagger that has an `operationId` of `SomeApi::doSomething`, then the workflow to call this API is as follows:

* You can make the call to `Client.SomeApi.doSomething()`
* You would pass in any parameters that is defined in the swagger
	* note that if the method is expecting any schemas, you would pass in the strongly typed Model that was code generated for it.
	* note that it doesn't matter if the parameter is a `body`, `query` or `path` parameter... the Client API treats all of them the same way.  All you need to do is to pass it in and the code generated method will generate the `fetch()` call appropriately.
	* note that you don't need to worry about what URL to call.  Again, the Client API does this for you.
	* note that it doesn't matter if this is a `POST`, `GET`, `PUT`, `DELETE`, etc.  Again, the Client API takes care of figuring this out for you.
* You would also pass in a `ResponseHandler` to define your response callbacks
	* this is similar in concept to a Promise, except that it is more robust/featured to handle promises based on the actual HTTP Status Code.  You can also define pre-configured/default promise handlers
	* you would have a `status###` response handler defined for each HTTP Status Code you are expecting
	* you should also define an `else` response handler to handle any HTTP Status Code that you received which weren't defined/specified
	* You should also define an `error` response handler to handle any HTTP transport errors
* The code generated `doSomething()` method will then make the following calls to the `ClientMiddleware` (and remember, all of these methods are *designed* to be modified for your application):
	* `getEndpointUrl` to get the root endpoint URL for all webservice method calls
	* `generateRequestOptionsForMethod` to get the options to pass into the `fetch()` call
	* `generateDefaultResponseHandler` to get the "default" set of ResponseHandlers, of which any would be overridden by the specific Call

So to illustrate the above example more fully, suppose the swagger is defined as follows:

```
{
	...
	"paths": {
		"/some_api/do_something/{id}": {
			"post": {
				"operationId": "SomeApi::doSomething",
				"parameters": [
					{
						"in": "path",
						"name": "id",
						"type": "string"
					},
					{
						"in": "body",
						"name": "person",
						"schema": {
							"$ref": "#/definitions/Person"
						}
					}
				],
				"responses": {
					"200": {
						"schema": {
							"$ref": "#/definitions/DoSomethingResponse"
						}
					},
					"404": {
						"description": "id was not found"
					},
					"409": {
						"description": "there was a conflict trying to do this action"
					}
				}
			}
		},
		...
		"definitions": {
			"Person": {
				"type": "object",
				"properties": {
					"email": {"type": "string"},
					"password": {"type": "string"}
				}
			},
			"DoSomethingResponse": {
				"type": "object",
				"properties": {
					"message": {"type": "string"},
					"configuration": {"type": "string"}
				}
			}
		}
	}
}
```

Your call to DoSomething would then look as follows:

```
const id = 1234;

const person = new Person();
person.email = 'johndoe@example.com';
person.password = 'mypassword';

Client.doSomething(id, person, {
	status200: doSomethingResponse => {
		alert("The call was successful... the configuration is " + doSomethingResponse.configuration);
	},
	status404: responseText => {
		alert('The ID was not found.  Here is the response from the server: ' + responseText);
	},
	status409: responseText => {
		alert('There was a conflict trying to do this.  Here is the response from the server: ' + responseText);
	},
	else: (statusCode, responseText) => {
		alert('Oops, we were not expecting a HTTP status code of ' + statusCode);
	},
	error: error => {
		alert('An error occurred.  Please view the console for more information.');
		console.error(error);
	}
});
```

As you can see, the input and outputs use standard JavaScript primitives or code generated strongly typed models.  And note that the ResponseHandler specifies what to do for each different HTTP Status Code that you are expecting, or an `else` as a catch all for anything else you may have missed.

Also, for *most* applications, you will want to define a default `else` and `error` handler that would account for most of your use cases.  You can define this in `ClientMiddleware.js`, and this would make most of your Client API calls cleaner since you will not need to define these handlers all the time.