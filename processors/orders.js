"use strict";
const firebase = require("firebase")
const stripe = require("stripe")("sk_test_SxgHrj7U8Jo6L0K2iL9WErRt")

const ORDER_STATUS = {
    STARTED: 'started',
    COMPLETED: 'success',
    FAILED: 'error'
}

// Firebase
const initFirebase = () => {
    firebase.initializeApp({
        apiKey: "AIzaSyD_3TWLSxXD-Mznzio-KOS9vEJJhtQgTIE",
        authDomain: "fir-experiment-96656.firebaseapp.com",
        databaseURL: "https://fir-experiment-96656.firebaseio.com",
        storageBucket: "fir-experiment-96656.appspot.com",
        messagingSenderId: "103181426938"
    })
}

exports.fbOrderStatus = (orderId, status, err = null) => {
    const ref = firebase.database().ref("orders/" + orderId)
    return ref.update({"/status": status, "/error": err})
}

exports.fbUpdateOrder = (orderId, customer, charge) => {
    const ref = firebase.database().ref("orders/" + orderId)
    const updates = {"/customer/stripe-id": customer.id, "/payment/stripe-id": charge.id}
    return ref.update(updates)
}

// Stripe
exports.stripeCreateCustomer = (token, customer) => {
    return new Promise((resolve, reject) => {
        stripe.customers.create({
            email: customer.email,
            metadata: customer,
            source: token
        }, (err, customer) => {
            if (err) reject(err)
            else resolve(customer)
        })
    })
}

exports.stripeCreateCharge = (customer, product, opts = {}) => {
    return new Promise((resolve, reject) => {
        const descr = "Echo " + product.name
        stripe.charges.create({
            amount: product.price * 100,
            currency: opts.currency || "gbp",
            customer: customer.id,
            description: descr,
            metadata: {
                email: customer.email,
                customerId: customer.id
            },
            statement_descriptor: descr
        }, (err, charge) => {
            if (err) reject(err)
            else resolve(charge)
        })
    })
}

// Domain logic
exports.processOrder = (orderId, order) => {
    if (order.status == ORDER_STATUS.COMPLETED || order.status == ORDER_STATUS.FAILED) {
        return Promise.resolve()
    }

    return exports.fbOrderStatus(orderId, ORDER_STATUS.STARTED)
        .then(() => {
            return exports.stripeCreateCustomer(order.payment.token, order.customer)
        })
        .then((customer) => {
            return exports.stripeCreateCharge(customer, order.product)
                .then((charge) => {
                    return exports.fbUpdateOrder(orderId, customer, charge)
                })
        })
        .then(
            () => {
                return exports.fbOrderStatus(orderId, ORDER_STATUS.COMPLETED)
            },
            (err) => {
                return exports.fbOrderStatus(orderId, ORDER_STATUS.FAILED, err.message)
                    .then(() => {
                        return Promise.reject(err)
                    })
            })
}

const listenToNewOrders = () => {
    const ref = firebase.database().ref("orders")
    ref.on("child_added", (snapshot) => {
        let order = snapshot.val()
        let orderId = snapshot.key
        exports.processOrder(orderId, order)
            .then(
                () => {
                    console.log("Processed order", order)
                },
                (err) => {
                    console.error("Error processing order", err)
                })
    })
}

exports.listen = () => {
    return Promise.resolve(initFirebase())
        .then(listenToNewOrders)
}
