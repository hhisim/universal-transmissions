import { NextRequest, NextResponse } from "next/server";
import { getProduct } from "@/data/products";

async function getPayPalAccessToken(): Promise<string | null> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) return null;

  try {
    const res = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    });
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { productId } = await req.json();
    const product = getProduct(productId);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const accessToken = await getPayPalAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: "PayPal not configured" }, { status: 500 });
    }

    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: product.price.toFixed(2),
          },
          description: product.title,
        },
      ],
    };

    const res = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("PayPal API error:", data);
      return NextResponse.json({ error: "PayPal order creation failed" }, { status: 502 });
    }

    return NextResponse.json({ orderId: data.id });
  } catch (err) {
    console.error("PayPal create-order error:", err);
    return NextResponse.json({ error: "PayPal order creation failed" }, { status: 500 });
  }
}
