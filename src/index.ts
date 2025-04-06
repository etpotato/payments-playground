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

fastify.get("/", async (_request, reply) => {
  return reply.view("./public/index.html", { STRIPE_PUBLISHABLE_KEY });
});

fastify.get("/success", async (_request, reply) => {
  return reply.view("./public/success.html");
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
