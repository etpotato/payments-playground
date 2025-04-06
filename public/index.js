import "https://js.stripe.com/v3/";

window.addEventListener("DOMContentLoaded", setupCheckout);
window.addEventListener("DOMContentLoaded", checkPaymentStatus);

function setupCheckout() {
  // eslint-disable-next-line no-undef
  const stripe = Stripe(window.CONFIG.STRIPE_PUBLISHABLE_KEY);
  const payButton = document.querySelector(".pay_button");

  if (!payButton) {
    return;
  }

  payButton.addEventListener("click", handlePayment);

  async function handlePayment() {
    const checkout = await stripe.initEmbeddedCheckout({ fetchClientSecret });
    checkout.mount("#checkout");
  }
}

async function fetchClientSecret() {
  try {
    const itemId = Math.floor(Math.random() * 1000);
    const itemCount = Math.floor(Math.random() * 10) + 1;
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, itemCount }),
    });
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();
    return data.clientSecret;
  } catch (error) {
    console.error("Error creating payment intent:", error);
  }
}

async function checkPaymentStatus() {
  const session_id = new URLSearchParams(window.location.search).get(
    "session_id",
  );
  const paymentDetailsEl = document.querySelector(".payment_details");

  if (!session_id || !paymentDetailsEl) {
    return;
  }

  try {
    const response = await fetch(
      `/api/session_status?session_id=${session_id}`,
    );

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.json();

    paymentDetailsEl.textContent = `status: ${data.status}`;
  } catch (error) {
    console.error("Error fetching payment status:", error);
  }
}
