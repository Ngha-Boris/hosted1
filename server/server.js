const express = require("express");
const app = express();
const env = require("dotenv").config({ path: "./.env" });
const cors = require("cors");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-04-10",
});

app.use(cors());
app.use(express.json());

// Endpoint to create a Checkout Session
app.post("/create-checkout-session", async (req, res) => {
  try {
    // Create a product
    const product = await stripe.products.create({
      name: "Custom Product",
      description: "Multi-currency product",
    });

    // Create a price for the product
    const price = await stripe.prices.create({
      unit_amount: 1000,
      currency: "usd",
      product: product.id,
    });

    // Define session configuration
    const sessionConfig = {
      payment_method_types: ["card", "eps"],
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/cancel`,
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

// Endpoint to create a new Express account and onboarding link
app.post("/create-account", async (req, res) => {
  const { email } = req.body;

  try {
    // Create a new Express account
    const account = await stripe.accounts.create({
      type: "express",
      country: "DE",
      email: email,
    });

    // Create an onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: "http://localhost:5252/onboarding/refresh",
      return_url: "http://localhost:5252/onboarding/return",
      type: "account_onboarding",
    });

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
    res.json({ loginLink: loginLink.url });
  } catch (error) {
    console.error("Error creating login link:", error.message);
    res.status(500).json({ error: error.message });
  }
});
// Start the server
app.listen(5252, () => {
  console.log(`Node server listening at http://localhost:5252`);
});
