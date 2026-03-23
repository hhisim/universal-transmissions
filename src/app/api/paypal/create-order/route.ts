import { NextRequest, NextResponse } from "next/server";
import { getProduct } from "@/data/products";

export async function POST(req: NextRequest) {
  try {
    const { productId } = await req.json();
    const product = getProduct(productId);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
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

    const res = await fetch("https://api-m.sandbox.paypal.com/v2/checkout/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PAYPAL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const data = await res.json();
    return NextResponse.json({ orderId: data.id });
  } catch (err) {
    console.error("PayPal create-order error:", err);
    return NextResponse.json({ error: "PayPal order creation failed" }, { status: 500 });
  }
}
