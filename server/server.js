const express = require("express");
const app = express();
const { resolve } = require("path");
const env = require("dotenv").config({ path: "./.env" });
const cors = require("cors")

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-04-10",
});

app.use(cors());
app.use(express.json());

// Mock database for storing customer IDs
const customerDatabase = {}; // Replace this with your real databas

app.post("/create-checkout-session", async (req, res) => {
  try {
    // Create a product
    const product = await stripe.products.create({
      name: 'Custom Product',
      description: 'Multi-currency product',
    });
    // Create a recurring price for the subscription
    const price = await stripe.prices.create({
      unit_amount: 1000, 
      currency: 'usd',  
      product: product.id,
    });
    // Define session configuration
    const sessionConfig = {
      payment_method_types: ['card','eps'],
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/cancel.html`,
    };
    // Create the Checkout Session
    const session = await stripe.checkout.sessions.create(sessionConfig);
    // Send the Checkout URL to the client
    res.send({ url: session.url });
  } catch (error) {
    console.error("Error creating Checkout Session:", error.message);
    res.status(400).send({
      error: { message: error.message, requestId: error.requestId },
    });
  }
});

app.post("/create-account", async (req, res) => {
  const { email } = req.body;

  try {
    // Step 1: Create a new Express account
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: email,
    });

    console.log("Account created successfully:", account.id);

    // Step 2: Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: "http://localhost:5252/onboarding/refresh",
      return_url: "http://localhost:5252/onboarding/return",
      type: "account_onboarding",
    });

    console.log("Account onboarding link created:", accountLink.url);

    res.json({
      accountId: account.id,
      onboardingLink: accountLink.url,
    });
  } catch (error) {
    console.error("Error creating account or onboarding link:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to create a Login Link for the Express account
app.post("/create-login-link", async (req, res) => {
  const { accountId } = req.body;

  try {
    // Create the login link
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    console.log("Login Link created:", loginLink.url);

    res.json({ loginLink: loginLink.url });
  } catch (error) {
    console.error("Error creating login link:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to create a Destination Charge
app.post("/create-destination-charge", async (req, res) => {
  const { accountId, amount, currency, customerId, sourceId } = req.body;

  try {
    // Create a Destination Charge
    const charge = await stripe.charges.create(
      {
        amount: amount,
        currency: currency,
        customer: customerId,   // Optional: if charging an existing customer
        source: sourceId,       // Optional: if using a specific payment source
        description: "Destination Charge for connected account",
        transfer_data: {
          destination: accountId,
        },
      },
      {
        stripeAccount: accountId, // Specifies the connected account
      }
    );

    console.log("Destination Charge created:", charge.id);
    res.json({ chargeId: charge.id });
  } catch (error) {
    console.error("Error creating destination charge:", error.message);
    res.status(500).json({ error: error.message });
  }
});
app.listen(5252, () =>
  console.log(`Node server listening at http://localhost:5252`))