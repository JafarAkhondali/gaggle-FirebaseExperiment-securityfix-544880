const firebase = require("firebase");
const stripe = require('stripe')("sk_test_SxgHrj7U8Jo6L0K2iL9WErRt");

const initializeFirebase = function () {
    var config = {
        apiKey: "AIzaSyD_3TWLSxXD-Mznzio-KOS9vEJJhtQgTIE",
        authDomain: "fir-experiment-96656.firebaseapp.com",
        databaseURL: "https://fir-experiment-96656.firebaseio.com",
        storageBucket: "fir-experiment-96656.appspot.com",
        messagingSenderId: "103181426938"
    };
    firebase.initializeApp(config);
};

const listenToNewOrders = function (cb) {
    var ref = firebase.database().ref("orders");
    ref.limitToLast(1).on('child_added', function (snapshot) {
        var order = snapshot.val();
        if (order.status != null) return;
        setOrderState(snapshot.key, "processing");
        createCustomer(order.payment.token, order.customer, function (customer_err, customer) {
            setOrderState(snapshot.key, "processed customer");
            processOrder(customer.id, order, function (order_err, payment) {
                if (order_err) {
                    setOrderState(snapshot.key, "error processing payment");
                    console.warn(order_err);
                    cb(order_err);
                    return;
                }
                setOrderState(snapshot.key, "processed payment");
                updateOrder(snapshot.key, payment, customer, function (err) {
                    setOrderState(snapshot.key, "order fully processed");
                    cb(err, snapshot.key)
                });
            });
        });
    });
};

const setOrderState = function (order_id, state, cb) {
    var ref = firebase.database().ref("orders/" + order_id);
    var updates = {"/status": state};
    ref.update(updates, cb);
};

const updateOrder = function (order_id, payment, customer, cb) {
    var ref = firebase.database().ref("orders/" + order_id);
    var updates = {"/payment/stripe": payment, "/customer/stripe": customer};
    ref.update(updates, cb);
};

const processOrder = function (customer_id, order, cb) {
    stripe.charges.create({
        amount: 2000,
        currency: "gbp",
        "customer": customer_id,
        description: "Charge for daniel.jones@example.com"
    }, cb);
};

const createToken = function (number, month, year, cvc, cb) {
    var token = {
        card: {
            "number": '4242424242424242',
            "exp_month": 12,
            "exp_year": 2017,
            "cvc": '123'
        }
    };
    cb(null, token);

    //stripe.tokens.create({
    //    card: {
    //        "number": '4242424242424242',
    //        "exp_month": 12,
    //        "exp_year": 2017,
    //        "cvc": '123'
    //    }
    //}, cb);
};

const createCustomer = function (token, customer, cb) {
    stripe.customers.create({
        description: 'Customer for ethan.white@example.com',
        source: token
    }, cb);
};

const listen = function (cb) {
    initializeFirebase();
    listenToNewOrders(cb);
};

module.exports = listen;
