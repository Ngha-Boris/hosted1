const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const stripe = require("stripe");

// Load environment variables
dotenv.config({ path: "./.env" });
const app = express();
const stripeClient = stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-04-10",
});

// Middleware
app.use(cors({
  origin: "https://valsuh45.github.io", // Replace with your GitHub Pages URL
}));
app.use(express.json());

// Define the base path for your client-side application
const CLIENT_BASE_PATH = "/Stripe-Exercise-3";

// Endpoint to create a Checkout Session
app.post("/create-checkout-session", async (req, res) => {
  try {
    // Create a product
    const product = await stripeClient.products.create({
      name: "Ticket price",
      description: "This is how much you ticket cost",
    });

    // Create a price for the product
    const price = await stripeClient.prices.create({
      unit_amount: 1000, // Amount in smallest currency unit (e.g., cents for USD)
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
      success_url: `${req.headers.origin}${CLIENT_BASE_PATH}/Success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}${CLIENT_BASE_PATH}/Cancel`,
    };

    // Create the Checkout Session
    const session = await stripeClient.checkout.sessions.create(sessionConfig);

    // Send the Checkout URL to the client
    res.json({ url: session.url });
  } catch (error) {
    console.error("Error creating Checkout Session:", error.message);
    res.status(400).json({
      error: { message: error.message, requestId: error.requestId },
    });
  }
});

// Example Endpoint to Create an Account (if applicable)
app.post("/create-account", async (req, res) => {
  const { email } = req.body;
  try {
    const account = await stripeClient.accounts.create({
      type: "express",
      country: "DE",
      email: email,
    });

    const accountLink = await stripeClient.accountLinks.create({
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

// Example Endpoint to Create a Login Link for an Account
app.post("/create-login-link", async (req, res) => {
  const { accountId } = req.body;
  try {
    const loginLink = await stripeClient.accounts.createLoginLink(accountId);
    res.json({ loginLink: loginLink.url });
  } catch (error) {
    console.error("Error creating login link:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 5252;
app.listen(PORT, () => {
  console.log(`Node server is running at http://localhost:${PORT}`);
});
