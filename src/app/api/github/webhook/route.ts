import {
  handleWebhookEvent,
  verifyWebhookSignature,
} from "lib/github/webhook-service";
import logger from "logger";

export async function POST(request: Request) {
  try {
    // Get the webhook event type
    const event = request.headers.get("x-github-event");

    if (!event) {
      return new Response("Missing GitHub event header", { status: 400 });
    }

    // Get the webhook signature
    const signature = request.headers.get("x-hub-signature-256");

    if (!signature) {
      return new Response("Missing GitHub signature header", { status: 400 });
    }

    // Get the webhook payload
    const payload = await request.text();

    // Verify the webhook signature
    const isValid = await verifyWebhookSignature(payload, signature);
    if (!isValid) {
      return new Response("Invalid signature", { status: 401 });
    }

    // Parse the payload
    const data = JSON.parse(payload);

    // Handle the webhook event
    const result = await handleWebhookEvent(event, data);

    if (result.success) {
      return Response.json(result);
    } else {
      return new Response(result.message, { status: 500 });
    }
  } catch (error: any) {
    logger.error("Error handling GitHub webhook:", error);
    return new Response(error.message || "Failed to handle webhook", {
      status: 500,
    });
  }
}
