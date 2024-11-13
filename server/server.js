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


// Start the server
app.listen(5252, () =>
  console.log(`Node server listening at http://localhost:5252`)
);
