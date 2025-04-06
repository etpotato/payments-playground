import "https://js.stripe.com/v3/";

window.addEventListener("DOMContentLoaded", initPaymentPage);
window.addEventListener("DOMContentLoaded", checkPaymentStatus);

function initPaymentPage() {
  const payButton = document.querySelector(".pay_button");

  if (!payButton) {
    return;
  }

  // eslint-disable-next-line no-undef
  const stripe = Stripe(window.CONFIG.STRIPE_PUBLISHABLE_KEY);

  payButton.addEventListener("click", (evt) => {
    evt.preventDefault();
    evt.currentTarget.remove();
    setupPayment(stripe);
  });
}

async function setupPayment(stripe) {
  try {
    const formEl = document.querySelector(".payment-form");
    const paymentEl = formEl.querySelector(".payment-element");

    if (!formEl || !paymentEl) {
      return;
    }

    const elements = stripe.elements({
      clientSecret: await getClientSecret(),
    });
    const paymentElement = elements.create("payment");
    paymentElement.mount(".payment-element");

    const submitButtonEl = document.createElement("button");
    submitButtonEl.type = "submit";
    submitButtonEl.textContent = "Submit";
    formEl.appendChild(submitButtonEl);

    formEl.addEventListener("submit", (evt) => {
      evt.preventDefault();
      confirmPayment(stripe, elements);
    });
  } catch (error) {
    console.error("Error setting up payment:", error);
  }
}

async function confirmPayment(stripe, elements) {
  const result = await stripe.confirmPayment({
    elements,
    confirmParams: {
      return_url: "http://localhost:3000/success",
    },
  });

  if (result.error) {
    const messageContainer = document.querySelector("#error-message");
    messageContainer.textContent = result.error.message;
  }
}

async function getClientSecret() {
  try {
    const itemId = Math.floor(Math.random() * 1000);
    const itemCount = Math.floor(Math.random() * 10) + 1;

    const response = await fetch("/api/payment_intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, itemCount }),
    });
    if (!response.ok) {
      throw new Error("Payment intent: response is not ok");
    }
    const data = await response.json();
    return data.clientSecret;
  } catch (error) {
    console.error("Error creating payment intent:", error);
  }
}

async function checkPaymentStatus() {
  try {
    // eslint-disable-next-line no-undef
    const stripe = Stripe(window.CONFIG.STRIPE_PUBLISHABLE_KEY);
    const paymentIntentClientSecret = new URLSearchParams(
      window.location.search,
    ).get("payment_intent_client_secret");
    const paymentDetailsEl = document.querySelector(".payment_details");

    if (!paymentIntentClientSecret || !paymentDetailsEl) {
      return;
    }

    const result = await stripe.retrievePaymentIntent(
      paymentIntentClientSecret,
    );

    paymentDetailsEl.textContent = `status: ${result.paymentIntent.status}`;
  } catch (error) {
    console.error("Error fetching payment status:", error);
  }
}
