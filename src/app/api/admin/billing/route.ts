import { NextResponse } from "next/server";
import { billingRepository } from "lib/db/repository";

export async function GET() {
  try {
    const subscriptions = await billingRepository.selectAllSubscriptions();

    return NextResponse.json({ subscriptions });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch billing data" },
      { status: 500 }
    );
  }
}
