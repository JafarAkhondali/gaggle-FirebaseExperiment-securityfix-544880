"use strict";
const assert = require("assert")
const rewire = require("rewire")
const sinon = require("sinon")

describe("orders", () => {
    let orders
    const customer = {id: "Cu1", email: "foo@bar.baz"}
    const product = {name: "Item", price: 1.50}
    const charge = {id: "Ch1"}
    const payment = {token: "payment token"}

    const mockFirebaseUpdate = () => {
        const stub = sinon.stub()
        const firebase = orders.__get__("firebase")
        firebase.database = () => {
            return {
                ref: () => {
                    return {update: stub}
                }
            }
        }
        stub.returns(Promise.resolve())
        return stub
    }

    const mockStripeCustomers = () => {
        const stub = sinon.stub()
        const stripe = orders.__get__("stripe")
        stripe.customers = {create: stub}
        stub.yields(null, {})
        return stub
    }

    const mockStripeCharges = () => {
        const stub = sinon.stub()
        const stripe = orders.__get__("stripe")
        stripe.charges = {create: stub}
        stub.yields(null, {})
        return stub
    }

    beforeEach(() => {
        orders = rewire("../processors/orders")
    })

    describe("#fbOrderStatus()", () => {
        it("should call firebase correctly", () => {
            const stub = mockFirebaseUpdate().returns(Promise.resolve())
            return orders.fbUpdateOrder("O1", customer, charge)
                .then(() => {
                    sinon.assert.calledWith(stub, {
                        "/customer/stripe-id": "Cu1",
                        "/payment/stripe-id": "Ch1"
                    })
                })
        })
    })

    describe("#fbUpdateOrder()", () => {
        it("should call firebase correctly", () => {
            const stub = mockFirebaseUpdate().returns(Promise.resolve())
            return orders.fbUpdateOrder("O1", customer, charge)
                .then(() => {
                    sinon.assert.calledWith(stub, {
                        "/customer/stripe-id": "Cu1",
                        "/payment/stripe-id": "Ch1"
                    })
                })
        })
    })

    describe("#stripeCreateCustomer()", () => {
        const stripe_tokens_create_data = require("./stripe.tokens.create")
        const stripe_customers_create_data = require("./stripe.customers.create")

        it("should call stripe correctly", () => {
            const stub = mockStripeCustomers().yields(null, stripe_customers_create_data)
            return orders.stripeCreateCustomer(stripe_tokens_create_data, customer)
                .then(() => {
                    sinon.assert.calledWith(stub, {
                        email: "foo@bar.baz",
                        metadata: {id: "Cu1", email: "foo@bar.baz"},
                        source: stripe_tokens_create_data
                    })
                })
        })

        it("should reject with error", () => {
            mockStripeCustomers().yields(new Error("Error"), null)
            return orders.stripeCreateCustomer(stripe_tokens_create_data, customer)
                .then(null, (err) => {
                    assert(err.message == "Error")
                })
        })

        it("should resolve to customer", () => {
            mockStripeCustomers().yields(null, stripe_customers_create_data)
            return orders.stripeCreateCustomer(stripe_tokens_create_data, customer)
                .then((customer) => {
                    assert(customer == stripe_customers_create_data)
                })
        })
    })

    describe("#stripeCreateCharge()", () => {
        const stripe_charges_create_data = require("./stripe.charges.create")

        it("should call stripe correctly", () => {
            const stub = mockStripeCharges().yields(null, stripe_charges_create_data)
            return orders.stripeCreateCharge(customer, product)
                .then(() => {
                    sinon.assert.calledWith(stub, {
                        amount: 150,
                        currency: "gbp",
                        customer: "Cu1",
                        description: "Echo Item",
                        metadata: {
                            email: "foo@bar.baz",
                            customerId: "Cu1"
                        },
                        statement_descriptor: "Echo Item"
                    })
                })
        })

        it("can specify currency", () => {
            const stub = mockStripeCharges().yields(null, stripe_charges_create_data)
            return orders.stripeCreateCharge(customer, product, {currency: "dkk"})
                .then(() => {
                    sinon.assert.calledWith(stub, sinon.match({currency: "dkk"}))
                })
        })

        it("should reject with error", () => {
            mockStripeCharges().yields(new Error("Error"), null)
            return orders.stripeCreateCharge(customer, product)
                .then(null, (err) => {
                    assert(err.message == "Error")
                })
        })

        it("should resolve to charge", () => {
            mockStripeCharges().yields(null, stripe_charges_create_data)
            return orders.stripeCreateCharge(customer, product)
                .then((charge) => {
                    assert(charge == stripe_charges_create_data)
                })
        })
    })

    describe("#processOrder()", () => {
        it("marks order with success status", () => {
            var spy = sinon.stub(orders, 'fbOrderStatus').returns(Promise.resolve())

            mockFirebaseUpdate()
            mockStripeCustomers()
            mockStripeCharges()

            const order = {status: undefined, payment: payment, customer: customer, product: product}
            return orders.processOrder("O1", order)
                .then(() => {
                    sinon.assert.callOrder(spy.withArgs("O1", "started"), spy.withArgs("O1", "success"))
                })
        })

        it("ignores orders with completed status", () => {
            var spy = sinon.stub(orders, 'fbOrderStatus').returns(Promise.resolve())

            mockFirebaseUpdate()
            mockStripeCustomers()
            mockStripeCharges()

            const order = {status: "success", payment: payment, customer: customer, product: product}
            return orders.processOrder("O1", order)
                .then(() => {
                    assert(spy.called == false)
                })
        })

        it("marks order with failure status on error", () => {
            var spy = sinon.stub(orders, 'fbOrderStatus').returns(Promise.resolve())

            mockFirebaseUpdate()
            mockStripeCustomers()
            mockStripeCharges().yields(new Error("error"), null)

            const order = {status: undefined, payment: payment, customer: customer, product: product}
            return orders.processOrder("O1", order)
                .catch((err) => {
                    sinon.assert.callOrder(spy.withArgs("O1", "started"), spy.withArgs("O1", "error"))
                })
        })
    })
})
