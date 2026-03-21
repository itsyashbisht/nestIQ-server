import razorpay from "razorpay";

const razorpayInstance = new razorpay({
  key: process.env.RAZORPAY_KEY,
  secret: process.env.RAZORPAY_SECRET,
});

export { razorpayInstance };
