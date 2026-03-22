import Razorpay from "razorpay";

const keyId = process.env.RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY;
const keySecret =
  process.env.RAZORPAY_KEY_SECRET ?? process.env.RAZORPAY_SECRET;

if (!keyId || !keySecret) {
  throw new Error(
    "Missing Razorpay credentials. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env",
  );
}

const razorpayInstance = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

export { razorpayInstance };
