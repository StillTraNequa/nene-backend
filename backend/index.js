const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const Stripe = require('stripe');

dotenv.config();

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL })); // Change to your frontend domain
app.use(express.json());

// Route to create checkout session
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { items, email, optedIn } = req.body;

    const line_items = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.title,
          description: item.notes || 'Custom press-on nail set',
        },
        unit_amount: parseInt(item.price.replace('$', '').replace('+', '')) * 100,
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      customer_email: email,
      success_url: `${process.env.FRONTEND_URL}/thank-you`,
      cancel_url: `${process.env.FRONTEND_URL}/cart`,
      metadata: {
        optedIn: optedIn ? 'true' : 'false',
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Error creating checkout session', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/webhook', express.raw({ type: 'application/json' }), (request, response) => {
  const sig = request.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return response.sendStatus(400);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const email = session.customer_email;
    const optedIn = session.metadata?.optedIn === 'true';

    if (optedIn && email) {
      console.log('✅ Send to Google Sheets:', email);
      // TODO: Add function here to send to Google Sheet
    }
  }

  response.status(200).send('Webhook received');
});


// Start server
app.listen(4242, () => console.log('Stripe backend running on port 4242'));
