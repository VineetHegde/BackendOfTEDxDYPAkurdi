// // utils/razorpayUtils.js
// const Razorpay = require("razorpay");
// const crypto = require("crypto");

// // Environment/config
// const RZP_KEY_ID     = process.env.TEDX_RAZORPAY_KEY_ID || "";
// const RZP_KEY_SECRET = process.env.TEDX_RAZORPAY_KEY_SECRET || "";
// const CURRENCY       = (process.env.TEDX_CURRENCY || "INR").toUpperCase();
// const ENV            = (process.env.NODE_ENV || "development").toLowerCase();

// // Expose a quick readiness check
// function isConfigured() {
//   return Boolean(RZP_KEY_ID && RZP_KEY_SECRET);
// }

// if (!isConfigured()) {
//   console.warn("⚠️ Razorpay keys missing: set TEDX_RAZORPAY_KEY_ID and TEDX_RAZORPAY_KEY_SECRET");
// }

// const razorpay = isConfigured()
//   ? new Razorpay({ key_id: RZP_KEY_ID, key_secret: RZP_KEY_SECRET })
//   : null;

// /**
//  * Convert a rupee amount to integer paise with strict validation.
//  * Accepts:
//  *  - number rupees (49) -> 4900
//  *  - string rupees ("49") -> 4900
//  *  - object { amountPaise: 4900 } -> 4900
//  */
// function toPaise(amount) {
//   if (amount == null) throw new Error("Amount is required");

//   // Direct paise pass-through
//   if (typeof amount === "object" && amount.amountPaise != null) {
//     const p = Number(amount.amountPaise);
//     if (!Number.isInteger(p) || p <= 0) throw new Error("Invalid amountPaise");
//     return p;
//   }

//   const num = Number(amount);
//   if (!Number.isFinite(num) || num <= 0) throw new Error("Invalid amount");

//   // Normalize to 2 decimals then to paise
//   const rupees = Number(num.toFixed(2));
//   const paise = Math.round(rupees * 100);
//   if (!Number.isInteger(paise) || paise <= 0) throw new Error("Invalid amount after normalization");
//   return paise;
// }

// /**
//  * Create a Razorpay order.
//  * @param {number|string|{amountPaise:number}} amountInput - rupees or {amountPaise}
//  * @param {object} meta - optional metadata { receiptHint, session, email, ticketIntent }
//  */
// async function createOrder(amountInput, meta = {}) {
//   if (!razorpay) throw new Error("Razorpay not configured");

//   const amount = toPaise(amountInput);

//   // Guardrails in non-prod
//   if (ENV !== "production" && amount > 5_00_00_000) {
//     // > ₹5,00,000 in test
//     throw new Error("Amount too large for non-production");
//   }

//   const { receiptHint = "", session, email, ticketIntent } = meta;

//   const options = {
//     amount,
//     currency: CURRENCY,
//     receipt: `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${receiptHint ? "_" + String(receiptHint).slice(0, 32) : ""}`,
//     payment_capture: 1,
//     notes: {
//       env: ENV,
//       // Session is passed through as-is; normalize earlier in your controller
//       session: session || "",
//       email: email || "",
//       ticketIntent: ticketIntent || "",
//     },
//   };

//   try {
//     const order = await razorpay.orders.create(options);
//     return order;
//   } catch (err) {
//     const msg = err?.message || "Unknown error";
//     const status = err?.status || err?.response?.status;
//     const data = err?.response?.data ? JSON.stringify(err.response.data).slice(0, 400) : "n/a";
//     console.error(`Error creating Razorpay order: ${msg} (status: ${status || "n/a"}, data: ${data})`);
//     throw err;
//   }
// }

// /**
//  * Verify Razorpay payment signature.
//  * @returns {boolean}
//  */
// function verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
//   if (!RZP_KEY_SECRET) return false;
//   if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) return false;
//   const hmac = crypto.createHmac("sha256", RZP_KEY_SECRET);
//   hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
//   const expected = hmac.digest("hex");
//   return expected === razorpaySignature;
// }

// /**
//  * Compute expected signature (useful in tests).
//  */
// function computeSignature(razorpayOrderId, razorpayPaymentId) {
//   if (!RZP_KEY_SECRET) throw new Error("Razorpay secret not configured");
//   return crypto
//     .createHmac("sha256", RZP_KEY_SECRET)
//     .update(`${razorpayOrderId}|${razorpayPaymentId}`)
//     .digest("hex");
// }

// module.exports = {
//   createOrder,
//   verifyPayment,
//   computeSignature,
//   toPaise,
//   isConfigured,
// };


const Razorpay = require("razorpay");
const crypto = require("crypto");

// ⚡ CRITICAL FIX: Check both possible environment variable names
const RZP_KEY_ID = process.env.TEDX_RAZORPAY_KEY_ID || process.env.TEDX_RAZORPAY_ID || "";
const RZP_KEY_SECRET = process.env.TEDX_RAZORPAY_KEY_SECRET || process.env.TEDX_RAZORPAY_SECRET || "";
const CURRENCY = (process.env.TEDX_CURRENCY || "INR").toUpperCase();
const ENV = (process.env.NODE_ENV || "development").toLowerCase();

// 🔧 ENHANCED DEBUGGING: Show actual values
console.log("🔑 Razorpay Environment Check:", {
  key_id_present: RZP_KEY_ID ? `✅ Present (${RZP_KEY_ID.slice(0, 12)}...)` : "❌ Missing",
  key_secret_present: RZP_KEY_SECRET ? `✅ Present (${RZP_KEY_SECRET.slice(0, 8)}...)` : "❌ Missing",
  currency: CURRENCY,
  env: ENV,
  key_type: RZP_KEY_ID.startsWith('rzp_test_') ? "🧪 TEST" : RZP_KEY_ID.startsWith('rzp_live_') ? "🔴 LIVE" : "❓ UNKNOWN",
  // 🔧 SHOW ACTUAL VALUES FOR DEBUGGING
  actual_key_id: RZP_KEY_ID,
  actual_key_secret: RZP_KEY_SECRET ? `${RZP_KEY_SECRET.slice(0, 8)}...` : "null"
});

// Enhanced configuration check
function isConfigured() {
  const hasKeys = Boolean(RZP_KEY_ID && RZP_KEY_SECRET);
  const validKeyFormat = RZP_KEY_ID && RZP_KEY_ID.match(/^rzp_(test|live)_[a-zA-Z0-9]+$/);
  
  if (!hasKeys) {
    console.error("❌ CRITICAL: Razorpay keys missing!");
    console.error("Available env vars:", Object.keys(process.env).filter(k => k.includes('RAZORPAY')));
    return false;
  }
  
  if (!validKeyFormat) {
    console.error("❌ CRITICAL: Invalid Razorpay key format! Key should start with 'rzp_test_' or 'rzp_live_'");
    console.error("Current key:", RZP_KEY_ID);
    return false;
  }
  
  return true;
}

// Create Razorpay instance with enhanced error handling
let razorpay = null;
try {
  if (isConfigured()) {
    razorpay = new Razorpay({ 
      key_id: RZP_KEY_ID, 
      key_secret: RZP_KEY_SECRET 
    });
    console.log("✅ Razorpay instance created successfully");
  } else {
    console.error("❌ Cannot create Razorpay instance - invalid configuration");
    // 🔧 DON'T throw error here, let it fail gracefully
  }
} catch (error) {
  console.error("❌ Failed to create Razorpay instance:", error.message);
  // 🔧 Don't throw - let the system handle gracefully
  razorpay = null;
}

function toPaise(amount) {
  if (amount == null) throw new Error("Amount is required");
  
  if (typeof amount === "object" && amount.amountPaise != null) {
    const p = Number(amount.amountPaise);
    if (!Number.isInteger(p) || p <= 0) throw new Error("Invalid amountPaise");
    return p;
  }
  
  const num = Number(amount);
  if (!Number.isFinite(num) || num <= 0) throw new Error("Invalid amount");
  
  const rupees = Number(num.toFixed(2));
  const paise = Math.round(rupees * 100);
  if (!Number.isInteger(paise) || paise <= 0) throw new Error("Invalid amount after normalization");
  
  if (paise > 50_00_000) { // Max ₹50,000
    throw new Error("Amount too large - maximum allowed is ₹50,000");
  }
  
  return paise;
}

async function createOrder(amountInput, meta = {}) {
  console.log("🎫 Creating Razorpay order with amount:", amountInput, "meta:", meta);
  
  // 🔧 CRITICAL: Better null check
  if (!razorpay) {
    throw new Error("Razorpay instance not initialized - check your API keys in environment variables");
  }
  
  const amount = toPaise(amountInput);
  
  if (ENV !== "production" && amount > 5_00_00_000) {
    throw new Error("Amount too large for non-production");
  }
  
  const { receiptHint = "", session, email, ticketIntent } = meta;
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).slice(2, 8);
  const receiptSuffix = receiptHint ? "_" + String(receiptHint).slice(0, 32) : "";
  
  const options = {
    amount,
    currency: CURRENCY,
    receipt: `tedx_${timestamp}_${randomId}${receiptSuffix}`,
    payment_capture: 1,
    notes: {
      env: ENV,
      session: session || "",
      email: email || "",
      ticketIntent: ticketIntent || "",
      created_at: new Date().toISOString(),
    },
  };
  
  try {
    console.log("🔄 Calling razorpay.orders.create with options:", JSON.stringify(options, null, 2));
    
    const order = await razorpay.orders.create(options);
    
    if (!order || !order.id) {
      throw new Error("Invalid order response from Razorpay - missing order ID");
    }
    
    console.log("✅ Order created successfully:", {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status
    });
    
    return order;
    
  } catch (err) {
    const msg = err?.message || "Unknown error";
    const status = err?.status || err?.response?.status || err?.statusCode;
    
    let errorType = "UNKNOWN";
    if (msg.includes('authentication') || msg.includes('Unauthorized') || status === 401) {
      errorType = "AUTHENTICATION";
      console.error("🚨 AUTHENTICATION ERROR: Check your live Razorpay keys!");
    } else if (msg.includes('invalid request') || status === 400) {
      errorType = "VALIDATION";
    }
    
    console.error(`❌ Error creating Razorpay order [${errorType}]: ${msg} (status: ${status || "n/a"})`);
    
    if (errorType === "AUTHENTICATION") {
      throw new Error("Razorpay authentication failed - verify your live API keys are correct and active");
    } else {
      throw new Error(`Razorpay order creation failed: ${msg}`);
    }
  }
}

function verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
  console.log("🔐 Verifying payment signature:", {
    orderId: razorpayOrderId ? "✅" : "❌",
    paymentId: razorpayPaymentId ? "✅" : "❌", 
    signature: razorpaySignature ? "✅" : "❌",
    secretConfigured: RZP_KEY_SECRET ? "✅" : "❌"
  });
  
  if (!RZP_KEY_SECRET) {
    console.error("❌ Cannot verify payment - Razorpay secret key not configured");
    return false;
  }
  
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    console.error("❌ Cannot verify payment - missing required parameters");
    return false;
  }
  
  try {
    const hmac = crypto.createHmac("sha256", RZP_KEY_SECRET);
    hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
    const expected = hmac.digest("hex");
    
    const isValid = expected === razorpaySignature;
    console.log(isValid ? "✅ Payment signature verified" : "❌ Payment signature verification failed");
    
    return isValid;
  } catch (error) {
    console.error("❌ Error during signature verification:", error.message);
    return false;
  }
}

function computeSignature(razorpayOrderId, razorpayPaymentId) {
  if (!RZP_KEY_SECRET) throw new Error("Razorpay secret not configured");
  return crypto
    .createHmac("sha256", RZP_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
}

async function testConnection() {
  if (!razorpay) {
    throw new Error("Razorpay instance not initialized");
  }
  try {
    await razorpay.payments.all({ count: 1 });
    console.log("✅ Razorpay connection test successful");
    return true;
  } catch (error) {
    console.error("❌ Razorpay connection test failed:", error.message);
    if (error.message.includes('authentication') || error.statusCode === 401) {
      throw new Error("Razorpay authentication failed - check your API keys");
    }
    throw error;
  }
}

module.exports = {
  createOrder,
  verifyPayment,
  computeSignature,
  toPaise,
  isConfigured,
  testConnection,
  razorpay,
};
