const express = require("express");
const app = express();
const { resolve } = require("path");
const env = require("dotenv").config({ path: "./.env" });
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-04-10",
});

app.use(express.static(process.env.STATIC_DIR));
app.use(express.json());

// Serve the home page
app.get("/", (req, res) => {
  const path = resolve(process.env.STATIC_DIR + "/index.html");
  res.sendFile(path);
});

// Config endpoint to retrieve the publishable key
app.get("/config", (req, res) => {
  res.send({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});
// Endpoint to create a Checkout Session
app.post("/create-checkout-session", async (req, res) => {
  try {
    // Retrieve existing customer by email or create a new one
    const email = "mbunwevicki@gmail.com";
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
      { customer: customer.id }
    );
    console.log("Payment method attached successfully:", paymentMethod);

    // Set the default payment method for invoices
    const updateCustomer = await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethod.id,
      },
    });
    console.log("Customer updated successfully:", updateCustomer);

    // Create an invoice
    const invoice = await stripe.invoices.create({
      customer: customer.id,
      collection_method: 'send_invoice',
      days_until_due: 30,
      pending_invoice_items_behavior: "include",
    });
    console.log("Invoice created:", invoice);

    // Add an invoice item
    const invoiceItem = await stripe.invoiceItems.create({
      customer: customer.id,
      price: "price_1QGHFpHcq0BpKt6raiXHqjOd",
      invoice: invoice.id,
    });
    console.log("Invoice item created:", invoiceItem);

    // Send the invoice to the customer
    const sendInvoice = await stripe.invoices.sendInvoice(invoice.id);
    console.log("Invoice sent to customer:", sendInvoice);

    // Create a Checkout Session for a subscription
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ["card"],
      line_items: [
        {
          price: "price_1QEukSHcq0BpKt6rcYKFtISU",
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
});

// Start the server
app.listen(5252, () =>
  console.log(`Node server listening at http://localhost:5252`)
);
