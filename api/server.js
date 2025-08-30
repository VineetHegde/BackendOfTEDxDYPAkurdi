

// require("dotenv").config();
// const express = require("express");
// const cors = require("cors");
// const morgan = require("morgan");
// const { google } = require("googleapis");
// const { connectDB } = require("./utils/db");
// const paymentRoutes = require("./paymentRoutes");

// const PORT = process.env.PORT || 4000; // FIXED: Changed to 4000

// // Allowed origins
// const allowedOrigins = [
//   "https://tedx-dyp-akurdi.vercel.app",
//   "https://tedxdev.netlify.app",
//   "http://localhost:3000",
//   "http://localhost:1234",
//   "http://127.0.0.1:1234",
//   /^http:\/\/localhost:\d+$/, // allow any localhost port
//   /^https:\/\/.+-saurabhmelgirkars-projects\.vercel\.app$/, // preview URLs
//    'https://www.tedxdypakurdi.com',
//     'https://tedxdypakurdi.com' ,
//     'https://frontend-of-te-dx-website.vercel.app',
// ];

// const app = express();
// const BODY_LIMIT = process.env.BODY_LIMIT || "10mb";

// // Middleware
// app.use(express.json({ limit: BODY_LIMIT }));
// app.use(express.urlencoded({ limit: BODY_LIMIT, extended: true }));
// app.use(morgan("tiny"));

// // CORS
// app.use(
//   cors({
//     origin: (origin, callback) => {
//       if (!origin) return callback(null, true);
//       const ok = allowedOrigins.some((o) =>
//         typeof o === "string" ? o === origin : o.test(origin)
//       );
//       return ok
//         ? callback(null, true)
//         : callback(new Error(`Not allowed by CORS: ${origin}`));
//     },
//     credentials: true,
//     methods: ["GET", "POST", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//     maxAge: 86400,
//   })
// );
// app.options("*", cors());

// // Routes
// app.get("/health", (req, res) => res.status(200).send("ok"));
// app.get("/", (req, res) => res.json({ message: "Server is running!" }));
// app.use("/api/payment", paymentRoutes);

// // FIXED: Add ticket routes for session recovery
// app.get("/api/tickets/:ticketId", async (req, res) => {
//   try {
//     const { ticketId } = req.params;
//     const Ticket = require("./models/Ticket");

//     const ticket = await Ticket.findOne({ ticketId }).lean();
//     if (!ticket) {
//       return res.status(404).json({ error: "Ticket not found" });
//     }

//     res.json(ticket);
//   } catch (err) {
//     console.error("Error fetching ticket:", err);
//     res.status(500).json({ error: "Failed to fetch ticket" });
//   }
// });

// app.use((req, res) => res.status(404).json({ error: "Not found" }));

// // Error handler
// app.use((err, req, res, next) => {
//   if (err?.type === "entity.too.large") {
//     return res.status(413).json({ error: "Payload too large" });
//   }
//   if (err instanceof SyntaxError && "body" in err) {
//     return res.status(400).json({ error: "Invalid JSON payload" });
//   }
//   console.error("Unhandled error:", err?.message || err);
//   res.status(500).json({ error: err?.message || "Internal Server Error" });
// });

// // ---- Google Sheets Auth ----
// async function verifyGoogleAuth() {
//   try {
//     const rawCreds = process.env.TEDX_GOOGLE_CREDENTIALS;
//     if (!rawCreds) {
//       throw new Error("Missing TEDX_GOOGLE_CREDENTIALS in env vars");
//     }

//     let creds;
//     try {
//       creds = JSON.parse(rawCreds);
//     } catch (err) {
//       throw new Error(
//         "Invalid JSON in TEDX_GOOGLE_CREDENTIALS (check escaping)"
//       );
//     }

//     if (!creds.private_key || !creds.client_email) {
//       throw new Error(
//         "Missing client_email or private_key in TEDX_GOOGLE_CREDENTIALS"
//       );
//     }

//     // Fix private key newlines
//     creds.private_key = creds.private_key.replace(/\\n/g, "\n");

//     const auth = new google.auth.JWT({
//       email: creds.client_email,
//       key: creds.private_key,
//       scopes: ["https://www.googleapis.com/auth/spreadsheets"],
//     });

//     await auth.authorize();
//     console.log("✅ Google Sheets auth OK");
//     return auth;
//   } catch (err) {
//     console.error("❌ Google auth failed:", err.message);
//     return null;
//   }
// }

// // ---- Start server ----
// (async () => {
//   try {
//     await connectDB();
//     await verifyGoogleAuth();
//     app.listen(PORT, () =>
//       console.log(`🚀 HTTP server listening on port ${PORT}`)
//     );
//   } catch (e) {
//     console.error("❌ Failed to start server:", e?.message || e);
//     process.exit(1);
//   }
// })();

// module.exports = app;
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { google } = require("googleapis");
const { connectDB } = require("./utils/db");
const paymentRoutes = require("./paymentRoutes");

const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || "development";

// 🔐 SECURE: Set only the PUBLIC Razorpay Key ID (safe to expose)
if (!process.env.TEDX_RAZORPAY_KEY_ID) {
  process.env.TEDX_RAZORPAY_KEY_ID = "rzp_live_RAdCru2UL8q5u1";
}

// Enhanced allowed origins
const allowedOrigins = [
  "https://tedx-dyp-akurdi.vercel.app",
  "https://tedxdev.netlify.app",
  "http://localhost:3000",
  "http://localhost:1234", 
  "http://127.0.0.1:1234",
  "http://localhost:5173",
  "http://localhost:3001",
  /^http:\/\/localhost:\d+$/,
  /^https:\/\/.+-saurabhmelgirkars-projects\.vercel\.app$/,
  'https://www.tedxdypakurdi.com',
  'https://tedxdypakurdi.com',
  'https://frontend-of-te-dx-website.vercel.app', // Added your current domain
  /^https:\/\/.*\.vercel\.app$/,
  /^https:\/\/.*\.netlify\.app$/,
];

const app = express();
const BODY_LIMIT = process.env.BODY_LIMIT || "10mb";

// 🔍 SECURE DEBUGGING: Enhanced startup validation without exposing secrets
console.log("🚀 Starting TEDx Payment Server...");
console.log("📋 Environment Configuration:", {
  NODE_ENV,
  PORT,
  BODY_LIMIT,
  RAZORPAY_KEY_ID: process.env.TEDX_RAZORPAY_KEY_ID ? "✅ Configured" : "❌ Missing",
  RAZORPAY_KEY_SECRET: process.env.TEDX_RAZORPAY_KEY_SECRET ? "✅ Configured" : "❌ Missing",
  RAZORPAY_MODE: process.env.TEDX_RAZORPAY_KEY_ID?.startsWith('rzp_live_') ? "🔴 LIVE" : "🧪 TEST",
  GOOGLE_CONFIGURED: !!process.env.TEDX_GOOGLE_CREDENTIALS,
  MONGODB_CONFIGURED: !!process.env.MONGODB_URI,
});

// 🚨 CRITICAL CHECK: Warn if secret key is missing
if (!process.env.TEDX_RAZORPAY_KEY_SECRET) {
  console.error("❌ CRITICAL: TEDX_RAZORPAY_KEY_SECRET not found!");
  console.error("💡 Set this environment variable in your Render dashboard:");
  console.error("   Variable: TEDX_RAZORPAY_KEY_SECRET");
  console.error("   Value: [Your secret key from Razorpay dashboard]");
  console.error("🔐 NEVER put secret keys in your code or commit them to Git!");
}

// Request logging middleware
if (NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Middleware
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ limit: BODY_LIMIT, extended: true }));

// Enhanced CORS
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      
      const ok = allowedOrigins.some((o) =>
        typeof o === "string" ? o === origin : o.test(origin)
      );
      
      if (ok) {
        callback(null, true);
      } else {
        console.warn(`🚫 CORS rejected origin: ${origin}`);
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type", 
      "Authorization", 
      "X-Requested-With",
      "Accept",
      "Origin"
    ],
    maxAge: 86400,
  })
);

app.options("*", cors());

// Request tracking middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 5000) {
      console.warn(`⏱️ Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
  });
  next();
});

// Enhanced health check
app.get("/health", async (req, res) => {
  try {
    const health = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: NODE_ENV,
      memory: process.memoryUsage(),
      services: {
        database: "unknown",
        razorpay: "unknown",
        google_sheets: "unknown"
      }
    };

    // Database check
    try {
      const { mongoose } = require("mongoose");
      health.services.database = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    } catch (e) {
      health.services.database = "error";
    }

    // Razorpay config check (secure - no secrets exposed)
    health.services.razorpay = (process.env.TEDX_RAZORPAY_KEY_ID && process.env.TEDX_RAZORPAY_KEY_SECRET) 
      ? "configured" 
      : "not_configured";

    // Google Sheets config check
    health.services.google_sheets = process.env.TEDX_GOOGLE_CREDENTIALS 
      ? "configured" 
      : "not_configured";

    res.status(200).json(health);
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "TEDx Payment Server is running!",
    version: "2.0.0",
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    razorpay_status: (process.env.TEDX_RAZORPAY_KEY_ID && process.env.TEDX_RAZORPAY_KEY_SECRET) ? "configured" : "missing"
  });
});

// API routes
app.use("/api/payment", paymentRoutes);

// Enhanced ticket routes
app.get("/api/tickets/:ticketId", async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    if (!ticketId || ticketId.length < 5) {
      return res.status(400).json({ 
        error: "Invalid ticket ID format" 
      });
    }

    const Ticket = require("./models/Ticket");
    const ticket = await Ticket.findOne({ ticketId }).lean();
    
    if (!ticket) {
      console.log(`❌ Ticket not found: ${ticketId}`);
      return res.status(404).json({ 
        error: "Ticket not found",
        ticketId 
      });
    }

    console.log(`✅ Ticket retrieved: ${ticketId}`);
    
    // Return sanitized ticket data
    const sanitizedTicket = {
      ticketId: ticket.ticketId,
      name: ticket.name,
      email: ticket.email,
      phone: ticket.phone,
      session: ticket.session,
      amount: ticket.amount,
      department: ticket.department || "",
      branch: ticket.branch || "",
      razorpayPaymentId: ticket.razorpayPaymentId,
      createdAt: ticket.createdAt
    };

    res.json(sanitizedTicket);
  } catch (err) {
    console.error("❌ Error fetching ticket:", err?.message || err);
    res.status(500).json({ 
      error: "Failed to fetch ticket",
      message: err?.message || "Internal server error"
    });
  }
});

// Debug endpoint (secure - no secrets exposed)
if (NODE_ENV !== "production") {
  app.get("/debug/env", (req, res) => {
    const safeEnv = {
      NODE_ENV,
      PORT,
      TEDX_EVENT_ID: process.env.TEDX_EVENT_ID,
      MONGODB_URI: process.env.MONGODB_URI ? "[CONFIGURED]" : "[MISSING]",
      TEDX_RAZORPAY_KEY_ID: process.env.TEDX_RAZORPAY_KEY_ID ? "[CONFIGURED]" : "[MISSING]",
      TEDX_RAZORPAY_KEY_SECRET: process.env.TEDX_RAZORPAY_KEY_SECRET ? "[CONFIGURED]" : "[MISSING]",
      TEDX_GOOGLE_CREDENTIALS: process.env.TEDX_GOOGLE_CREDENTIALS ? "[CONFIGURED]" : "[MISSING]",
      BODY_LIMIT
    };
    res.json(safeEnv);
  });
}

// 404 handler
app.use((req, res) => {
  console.warn(`❌ 404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: "Route not found",
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Enhanced global error handler
app.use((err, req, res, next) => {
  const timestamp = new Date().toISOString();
  const errorId = Math.random().toString(36).substring(2, 15);

  console.error(`❌ Error [${errorId}] at ${timestamp}:`, {
    message: err?.message,
    stack: err?.stack,
    method: req?.method,
    path: req?.path,
    origin: req?.headers?.origin,
    userAgent: req?.headers?.['user-agent']
  });

  if (err?.type === "entity.too.large") {
    return res.status(413).json({ 
      error: "Payload too large",
      maxSize: BODY_LIMIT,
      errorId
    });
  }

  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ 
      error: "Invalid JSON payload",
      message: "Request body contains invalid JSON",
      errorId
    });
  }

  if (err?.message?.includes("Not allowed by CORS")) {
    return res.status(403).json({
      error: "CORS policy violation",
      message: "Origin not allowed",
      errorId
    });
  }

  const isDevelopment = NODE_ENV === "development";
  res.status(500).json({
    error: "Internal Server Error",
    message: isDevelopment ? err?.message : "Something went wrong",
    errorId,
    timestamp,
    ...(isDevelopment && { stack: err?.stack })
  });
});

// Google Sheets Auth
async function verifyGoogleAuth() {
  try {
    console.log("🔐 Verifying Google Sheets authentication...");
    
    const rawCreds = process.env.TEDX_GOOGLE_CREDENTIALS;
    if (!rawCreds) {
      throw new Error("Missing TEDX_GOOGLE_CREDENTIALS in environment variables");
    }

    let creds;
    try {
      creds = JSON.parse(rawCreds);
    } catch (err) {
      throw new Error("Invalid JSON in TEDX_GOOGLE_CREDENTIALS (check escaping)");
    }

    if (!creds.private_key || !creds.client_email) {
      throw new Error("Missing client_email or private_key in TEDX_GOOGLE_CREDENTIALS");
    }

    creds.private_key = creds.private_key.replace(/\n/g, "\n");

    const auth = new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    await auth.authorize();
    console.log("✅ Google Sheets authentication successful");
    return auth;
    
  } catch (err) {
    console.error("❌ Google Sheets authentication failed:", err.message);
    if (NODE_ENV === "production") {
      console.warn("⚠️ Google Sheets will be unavailable - logging may fail");
    }
    return null;
  }
}

// 🔍 SECURE Razorpay configuration check
async function verifyRazorpayConfig() {
  try {
    console.log("🔐 Verifying Razorpay configuration...");
    
    const keyId = process.env.TEDX_RAZORPAY_KEY_ID;
    const keySecret = process.env.TEDX_RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error("Missing Razorpay API keys in environment variables");
    }

    const keyType = keyId.startsWith('rzp_test_') ? 'TEST' : keyId.startsWith('rzp_live_') ? 'LIVE' : 'UNKNOWN';
    
    if (keyType === 'UNKNOWN') {
      throw new Error("Invalid Razorpay key format - must start with 'rzp_test_' or 'rzp_live_'");
    }

    console.log(`✅ Razorpay ${keyType} keys configured successfully`);
    
    // Test connection
    try {
      const { testConnection } = require("./utils/razorpayUtils");
      await testConnection();
      console.log("✅ Razorpay connection test passed");
    } catch (testErr) {
      console.warn("⚠️ Razorpay connection test failed:", testErr.message);
      
      // Provide helpful debugging information
      if (testErr.message.includes('authentication') || testErr.message.includes('Unauthorized')) {
        console.error("💡 Possible causes:");
        console.error("   - Environment variable TEDX_RAZORPAY_KEY_SECRET not set correctly");
        console.error("   - Live Razorpay account needs KYC/business verification");
        console.error("   - API keys regenerated but not updated in environment");
      }
      
      if (NODE_ENV === "production") {
        throw testErr;
      }
    }

    return { keyType, configured: true };
    
  } catch (err) {
    console.error("❌ Razorpay configuration failed:", err.message);
    if (NODE_ENV === "production") {
      throw err;
    }
    return { configured: false, error: err.message };
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('📴 Received SIGINT, shutting down gracefully...');
  try {
    const { mongoose } = require("mongoose");
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  } catch (err) {
    console.error('❌ Error closing MongoDB:', err.message);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('📴 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Enhanced server startup
(async () => {
  try {
    console.log("🚀 Initializing TEDx Payment Server...");

    // 1. Connect to database
    console.log("📦 Connecting to MongoDB...");
    await connectDB();

    // 2. Verify Razorpay configuration
    const razorpayStatus = await verifyRazorpayConfig();
    if (!razorpayStatus.configured && NODE_ENV === "production") {
      throw new Error("Razorpay configuration failed in production environment");
    }

    // 3. Verify Google Sheets (non-blocking)
    await verifyGoogleAuth();

    // 4. Start server
    const server = app.listen(PORT, () => {
      console.log(`🎉 TEDx Payment Server started successfully!`);
      console.log(`🌐 Server: http://localhost:${PORT}`);
      console.log(`📊 Health: http://localhost:${PORT}/health`);
      console.log(`🔧 Environment: ${NODE_ENV}`);
      console.log(`💳 Razorpay: ${process.env.TEDX_RAZORPAY_KEY_ID?.startsWith('rzp_live_') ? '🔴 LIVE MODE' : '🧪 TEST MODE'}`);
      
      if (NODE_ENV !== "production") {
        console.log(`🐛 Debug info: http://localhost:${PORT}/debug/env`);
      }
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
      } else {
        console.error("❌ Server startup error:", err.message);
      }
      process.exit(1);
    });

  } catch (e) {
    console.error("❌ Failed to start server:", e?.message || e);
    console.error("💡 Check your environment variables and database connection");
    process.exit(1);
  }
})();

module.exports = app;
