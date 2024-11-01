const express = require("express");
const app = express();
const { resolve } = require("path");
const env = require("dotenv").config({ path: "./.env" });

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-04-10",
});

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


app.listen(5252, () =>
  console.log(`Node server listening at http://localhost:5252`)
);