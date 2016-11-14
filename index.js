const initFirebase = function () {
    // Initialize Firebase
    var config = {
        apiKey: "AIzaSyD_3TWLSxXD-Mznzio-KOS9vEJJhtQgTIE",
        authDomain: "fir-experiment-96656.firebaseapp.com",
        databaseURL: "https://fir-experiment-96656.firebaseio.com",
        storageBucket: "fir-experiment-96656.appspot.com",
        messagingSenderId: "103181426938"
    };
    firebase.initializeApp(config);
};

const initStripe = function () {
    Stripe.setPublishableKey('pk_test_GG7MBEODeoyPZRwVPjUOwGUT');
};

const initGreeting = function (element_id, firebase_path) {
    var element = document.getElementById(element_id);
    if (element == null) return;
    var ref = firebase.database().ref().child(firebase_path);
    ref.on("value", snap => element.innerText = snap.val());
};

const cardFormToToken = function (cb) {
    Stripe.card.createToken({
        number: "4000056655665556",
        cvc: "222",
        exp_month: 2,
        exp_year: 2020,
        address_zip: 90210
    }, function (status, response) {
        if (response.error) {
            return cb(response.error.message)
        }
        cb(null, response.id)
    });
};

const initLastEntry = function (element_id, firebase_path) {
    var element = document.getElementById(element_id);
    if (element == null) return;
    var ref = firebase.database().ref(firebase_path);
    ref.limitToLast(1).on("value", snap => element.innerText = JSON.stringify(snap.val(), null, 2));
};

const enableButton = function (element_id) {
    var element = document.getElementById(element_id);
    if (element == null) return;
    element.disabled = false;
};

const createNewOrder = function () {
    cardFormToToken(function (err, token) {
        if (err) {
            console.warn(err);
            return;
        }

        var newOrderKey = firebase.database().ref().child('orders').push().key;
        firebase.database().ref('orders/' + newOrderKey).set({
            "customer": {
                "id": "C1",
                "name": "John Smith",
                "email": "john@smith.com"
            },
            "product": {
                "id": "I1",
                "name": "Item",
                "price": 3.99
            },
            "payment": {
                "token": token
            }
        });
    })
};

document.addEventListener("DOMContentLoaded", function () {
    initFirebase();
    initStripe();
    initGreeting("dynamic-greeting", "greeting");
    initLastEntry("last-order", "orders");
    enableButton("create-order");
    console.log("Ready");
});
