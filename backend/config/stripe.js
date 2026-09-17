import Stripe from "stripe";

let client = null;

export const isStripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

export const getStripe = () => {
  if (!isStripeConfigured()) return null;
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
};

export default getStripe;
