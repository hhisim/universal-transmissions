import Stripe from "stripe";

// SDK version 20.4.1 uses 2024-11-20.acacia as default/latest
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_placeholder");
