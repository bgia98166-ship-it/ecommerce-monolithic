require("dotenv").config();

const shipmentRoutes = require("./shipmentRoutes");
const orderRoutes = require("./orderRoutes");
const express = require("express");
const helmet = require("helmet");
const prisma = require("./db");
const productRoutes = require("./productRoutes");
const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(helmet());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "E-commerce Monolithic API",
  });
});

app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "ok",
      database: "connected",
    });
  } catch (error) {
    console.error("Health check:", error.message);

    res.status(503).json({
      status: "error",
      database: "disconnected",
    });
  }
});

async function startServer() {
  try {
    await prisma.$connect();
    console.log("Kết nối PostgreSQL thành công!");

    app.listen(PORT, () => {
      console.log(`API đang chạy tại http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Không thể khởi động API:", error.message);
    await prisma.$disconnect();
    process.exitCode = 1;
  }
}

startServer();
const { router: authRoutes } = require("./authRoutes");
app.use(express.json());
if (
  !process.env.JWT_SECRET ||
  process.env.JWT_SECRET.length < 32 ||
  process.env.JWT_SECRET === "thay_bang_chuoi_ngau_nhien"
) {
  throw new Error("Hãy đặt JWT_SECRET ngẫu nhiên, ít nhất 32 ký tự");
}

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/shipments", shipmentRoutes);