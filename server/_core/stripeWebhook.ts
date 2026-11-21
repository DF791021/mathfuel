/**
 * Stripe Webhook Handler
 * Processes Stripe events and logs them
 */
import Stripe from "stripe";
import { Request, Response } from "express";
import { notifyOwner } from "./notification";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function handleStripeWebhook(req: Request, res: Response) {
  const signature = req.headers["stripe-signature"] as string;

  if (!signature) {
    console.error("Missing Stripe signature");
    return res.status(400).json({ error: "Missing signature" });
  }

  if (!stripe || !webhookSecret) {
    return res.status(503).json({ error: "Payment webhooks are not configured" });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return res.status(400).json({ error: "Invalid signature" });
  }

  // Handle test events
  if (event.id.startsWith("evt_test_")) {
    console.log("[Webhook] Test event detected:", event.type);
    return res.json({ verified: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`[Stripe] Checkout completed: ${session.id}`);
        await notifyOwner({
          title: "Payment Received",
          content: `Checkout session ${session.id} completed. Amount: ${(session.amount_total ?? 0) / 100} ${session.currency?.toUpperCase()}`,
        });
        break;
      }

      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.log(`[Stripe] Payment succeeded: ${pi.id}`);
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.log(`[Stripe] Payment failed: ${pi.id}`);
        await notifyOwner({
          title: "Payment Failed",
          content: `Payment ${pi.id} failed: ${pi.last_payment_error?.message || "Unknown error"}`,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        console.log(`[Stripe] Subscription cancelled: ${sub.id}`);
        await notifyOwner({
          title: "Subscription Cancelled",
          content: `Subscription ${sub.id} was cancelled.`,
        });
        break;
      }

      default:
        console.log(`[Stripe] Unhandled event: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}
