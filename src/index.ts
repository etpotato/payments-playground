import Fastify from "fastify";
import fastifyViews from "@fastify/view";
import Handlebars from "handlebars";
import Stripe from "stripe";
import { config } from "dotenv";
import { readFile } from "node:fs/promises";

config();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY as string;
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY as string;

if (!STRIPE_SECRET_KEY || !STRIPE_PUBLISHABLE_KEY) {
  throw new Error("Stripe keys are not set in the environment variables.");
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

const fastify = Fastify({
  logger: true,
});

fastify.register(fastifyViews, {
  engine: {
    handlebars: Handlebars,
  },
});

fastify.get("/:page", async (request, reply) => {
  const page = (request.params as { page?: string }).page || "index";

  return reply.view(`./public/${page}.html`, {
    STRIPE_PUBLISHABLE_KEY,
  });
});

fastify.get("/public/index.js", async (_request, reply) => {
  const readStream = await readFile("./public/index.js", "utf-8");
  reply.type("text/javascript");
  return reply.send(readStream);
});

fastify.post("/api/checkout", async (request, reply) => {
  try {
    const { itemId, itemCount } = request.body as {
      itemId: string;
      itemCount: number;
    };

    // check the prices in DB

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "T-shirt",
            },
            unit_amount: Number(itemId),
          },
          quantity: itemCount,
        },
      ],
      ui_mode: "embedded",
      mode: "payment",
      return_url:
        "http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}",
    });

    return reply.send({ clientSecret: session.client_secret });
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
});

fastify.post("/api/payment_intent", async (request, reply) => {
  const { itemId, itemCount } = request.body as {
    itemId: string;
    itemCount: string;
  };

  // check the prices in DB

  const amount = Number(itemId) * Number(itemCount);

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: "eur",
    automatic_payment_methods: {
      enabled: true,
    },
  });

  return reply.send({ clientSecret: paymentIntent.client_secret });
});

// TODO: add a webhook to handle the session status

fastify.get("/api/session_status", async (request, reply) => {
  const session = await stripe.checkout.sessions.retrieve(
    (request.query as { session_id: string }).session_id,
  );

  return reply.send(session);
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
