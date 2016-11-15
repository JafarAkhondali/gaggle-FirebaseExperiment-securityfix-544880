"use strict";
const STRIPE_PUBLISHABLE_KEY = "pk_test_GG7MBEODeoyPZRwVPjUOwGUT"
const FB_AUTH = {
    apiKey: "AIzaSyD_3TWLSxXD-Mznzio-KOS9vEJJhtQgTIE",
    authDomain: "fir-experiment-96656.firebaseapp.com",
    databaseURL: "https://fir-experiment-96656.firebaseio.com",
    storageBucket: "fir-experiment-96656.appspot.com",
    messagingSenderId: "103181426938"
}

// HTML
const enableElementById = (elementId) => {
    const el = document.getElementById(elementId)
    if (!el) return
    el.disabled = false
}

const gatherFormData = (elementIds) => {
    const data = {}
    for (let id of elementIds) {
        let el = document.getElementById(id)
        if (!el) throw "Could not gather form data from '" + id + "'"
        data[el.id] = el.value
    }
    return data
}

// Firebase
const initFirebase = () => {
    return firebase.initializeApp(FB_AUTH)
}

const fbLoadValue = (fbPath, elementId) => {
    const el = document.getElementById(elementId)
    if (!el) return
    const ref = firebase.database().ref().child(fbPath)
    ref.on("value", snap => el.innerText = snap.val())
}

const fbLoadLastValueAsJSON = (fbPath, elementId) => {
    const el = document.getElementById(elementId)
    if (!el) return
    const ref = firebase.database().ref(fbPath)
    ref.limitToLast(1).on("value", snap => el.innerText = JSON.stringify(snap.val(), null, 2))
}

const fbCreateOrder = (customer, product, token) => {
    const newOrderKey = firebase.database().ref().child("orders").push().key
    const order = {
        "customer": customer,
        "product": product,
        "payment": {"token": token}
    }
    return firebase.database().ref("orders/" + newOrderKey).set(order)
}

// Stripe
const initStripe = () => {
    Stripe.setPublishableKey(STRIPE_PUBLISHABLE_KEY)
}

const generateCardToken = (data) => {
    return new Promise((resolve, reject) => {
        Stripe.card.createToken(data, (status, response) => {
            response.error
                ? reject(response.error.message)
                : resolve(response.id)
        })
    })
}

// User-facing
document.submitForm = (formIds) => {
    return Promise.resolve(gatherFormData(formIds))
        .then((form) => {
            const data = {
                number: form.card_number,
                cvc: form.card_cvc,
                exp_month: form.card_exp_month,
                exp_year: form.card_exp_year
            }
            return generateCardToken(data)
                .then((token) => {
                    return fbCreateOrder(
                        {name: form.customer_name, email: form.customer_email},
                        {name: form.product_name, price: form.product_price},
                        token
                    )
                })
        })
        .then(
            () => {
                console.log("Created new order")
            },
            (err) => {
                console.error(err)
            })
}

document.addEventListener("DOMContentLoaded", () => {
    Promise.all([initFirebase(), initStripe()])
        .then(() => {
            return Promise.all([
                enableElementById("submit-order"),
                fbLoadValue("greeting", "dynamic-greeting"),
                fbLoadLastValueAsJSON("orders", "last-order")
            ])
        })
        .then(
            () => {
                console.log("Page ready")
            },
            (err) => {
                console.error(err)
            }
        )
})
