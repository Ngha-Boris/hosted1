const express = require("express");
const app = express();
const { resolve } = require("path");
const env = require("dotenv").config({ path: "./.env" });
const cors = require("cors");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-04-10",
});

app.use(cors());
app.use(express.json());

const customerDatabase = {}; // Replace this with your real database

// Webhook endpoint to receive invoice.created events
app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET; // Your webhook secret

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === "invoice.created") {
    const invoice = event.data.object;
    console.log("Invoice created:", invoice.id);

    // Perform any actions with the invoice here (e.g., log it, save to database, etc.)
  }

  // Respond to Stripe to acknowledge receipt of the event
  res.json({ received: true });
});

// Checkout session creation endpoint
app.post("/create-checkout-session", async (req, res) => {
  try {
    // Retrieve existing customer by email or create a new one if not found
    const email = "Boris@gmail.com";
    let customer = (await stripe.customers.list({ email, limit: 1 })).data[0];

    if (!customer) {
      customer = await stripe.customers.create({
        name: "Boris",
        email,
      });
      console.log("Customer created successfully:", customer.id);
    } else {
      console.log("Reusing existing customer:", customer.id);
    }

    const paymentMethod = await stripe.paymentMethods.attach(
      'pm_card_visa',
      {
        customer: customer.id,
      }
    );
   console.log("Payment method attached successfully:", paymentMethod);

    // Update the Customer's default Payment Method for invoices
    const updateCustomer = await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethod.id,
      },
    });
    console.log("Customer updated successfully:", updateCustomer);
    const requestId = updateCustomer.lastResponse.requestId;
    console.log("Request ID for updating customer:", requestId);

    const invoice = await stripe.invoices.create({
      customer: customer.id,
      collection_method: 'send_invoice',
      days_until_due: 30,
      pending_invoice_items_behavior: 'include',
    });

    const updateInvoice = await stripe.invoices.update(
      invoice.id,
      {
        auto_advance: false,
      }
    );

    console.log("invoice succesfully updated:", updateInvoice),
    console.log("updated invoice request id:", updateInvoice.lastResponse.requestId);

    // const invoiceItem = await stripe.invoiceItems.create({
    //   customer: customer.id,
    //   price: "price_1QG06aHcq0BpKt6riIps2SJm",
    //   invoice: invoice.id,
    // });

    // console.log("checking the invoice item: ", invoiceItem);

    const sendInvoice = await stripe.invoices.sendInvoice(invoice.id)

    console.log("Sending invoice to the customer successfully: ", sendInvoice)


  // Set up a payment method for future use in the subscription
  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    payment_method_types: ["card"],
    line_items: [
      {
        price: "price_1QEukSHcq0BpKt6rcYKFtISU", // Replace with a valid price ID
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${req.headers.origin}/cancel.html`,
  });

  console.log("Checkout Session created successfully:", session.id);
  res.json({ url: session.url });
} catch (error) {
  console.error("Error creating checkout session:", error.message);
  res.status(500).json({ error: error.message });
}

const paymentIntent = await stripe.paymentIntents.create({
  amount: 500,
  currency: 'eur',
  payment_method: 'pm_card_visa',
});

console.log("Payment Intent created successfully:", paymentIntent);

});

app.listen(5252, () => console.log(`Node server listening at http://localhost:5252`));
