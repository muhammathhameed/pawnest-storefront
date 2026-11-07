import "server-only";
import Stripe from "stripe";

let stripe: Stripe | undefined;

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || !/^sk_(test|live)_/.test(secretKey)) {
    throw new Error(
      "STRIPE_SECRET_KEY is missing or invalid; provide a Stripe secret key.",
    );
  }

  stripe ??= new Stripe(secretKey);
  return stripe;
}
