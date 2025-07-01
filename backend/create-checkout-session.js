const express = require('express');
const Stripe = require('stripe');
const router = express.Router();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY); 

router.post('/create-checkout-session', async (req, res) => {
  const { items, email } = req.body;

  const line_items = items.map((item) => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: item.title,
        images: [item.thumbnail || 'https://nenethearchitect.com/nails-preview-placeholder.jpg'],
      },
      unit_amount: parseInt(item.price.replace('$', '')) * 100, // $22 -> 2200 cents
    },
    quantity: item.quantity,
  }));

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      customer_email: email, // 👈 necessary for Stripe email receipt
      success_url: `${process.env.FRONTEND_URL}/thank-you`,
      cancel_url: `${process.env.FRONTEND_URL}/cart`,
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
