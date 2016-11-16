# FirebaseExperiment

`npm start`

Visit `http://localhost:3000`

Clicking the `Create order` button creates a new raw order,
which the server processes and updates with Stripe-relevant information.

## Details

Client creates a Stripe token, and submits it along with order details.

Every order is processed by the server by calling into Stripe and updating the Firebase order.

+ Credit card credentials are never stored on our infrastructure, we only deal with one-time use tokens provided by the client.
+ Server-side order processing could be a wholly separate microservice, it's only part of the server because it's easier to package up that way.
+ Front-end is woefully primitive, just the simplest means to create a Firebase order (e.g. the client currently determines the price of the product, which obviously makes no sense :)
+ Database permissions are disabled for this prototype, for any real usage the client should only be allowed to create new orders and the order processor should be allowed to update an order.

## Tests
`npm test` to run unittests. Only the backend is tested because the frontend is not representative.
