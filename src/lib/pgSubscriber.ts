import createSubscriber, { Subscriber } from "pg-listen";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:password@localhost:5432/postgres";

let subscriber: Subscriber | undefined;

export async function getSubscriber(): Promise<Subscriber> {
  if (!subscriber) {
    console.log("[pgSubscriber] Creating pg-listen subscriber");
    subscriber = createSubscriber(
      { connectionString: DATABASE_URL },
      { parse: (payload) => payload }
    );

    subscriber.events.on("error", (err) => {
      console.error("[pgSubscriber] Fatal error:", err);
    });

    await subscriber.connect();
    await subscriber.listenTo("printi_messages");
    console.log("[pgSubscriber] Connected and listening to printi_messages");
  }
  return subscriber;
}
