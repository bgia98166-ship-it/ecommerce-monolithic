const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const prisma = require("./db");

const router = express.Router();

const userSelect = {
  uid: true,
  username: true,
  fullname: true,
  role: {
    select: { rolename: true },
  },
  membership: true,
};

const registerSchema = z.object({
  username: z.string().trim().min(3).max(50),
  fullname: z.string().trim().min(1).max(100),
  password: z.string().min(8).max(72),
}).strict();

const loginSchema = z.object({
  username: z.string().trim().min(1).max(50),
  password: z.string().min(1).max(72),
}).strict();

// Đăng ký khách hàng
router.post("/register", async (req, res) => {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Dữ liệu đăng ký không hợp lệ",
      errors: result.error.issues,
    });
  }

  try {
    const { username, fullname, password } = result.data;

    const role = await prisma.role.findUnique({
      where: { rolename: "CUSTOMER" },
    });

    const membership = await prisma.memberShip.findUnique({
      where: { mname: "STANDARD" },
    });

    if (!role || !membership) {
      return res.status(503).json({
        message: "Chưa có dữ liệu nền. Hãy chạy seed.",
      });
    }

    const user = await prisma.user.create({
      data: {
        username,
        fullname,
        password: await bcrypt.hash(password, 12),
        roleid: role.roleid,
        mid: membership.mid,
      },
      select: userSelect,
    });

    return res.status(201).json({
      message: "Đăng ký thành công",
      user,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        message: "Tên đăng nhập đã tồn tại",
      });
    }

    console.error(error.message);

    return res.status(500).json({
      message: "Lỗi hệ thống",
    });
  }
});

// Đăng nhập
router.post("/login", async (req, res) => {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Dữ liệu đăng nhập không hợp lệ",
    });
  }

  try {
    const { username, password } = result.data;

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Sai tên đăng nhập hoặc mật khẩu",
      });
    }

    const token = jwt.sign(
      {},
      process.env.JWT_SECRET,
      {
        subject: String(user.uid),
        algorithm: "HS256",
        expiresIn: process.env.JWT_EXPIRES_IN || "1h",
      }
    );

    return res.status(200).json({
      message: "Đăng nhập thành công",
      token,
      tokenType: "Bearer",
    });
  } catch (error) {
    console.error(error.message);

    return res.status(500).json({
      message: "Lỗi hệ thống",
    });
  }
});

// Kiểm tra JWT
async function authenticate(req, res, next) {
  const authorization = req.headers.authorization || "";
  const parts = authorization.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({
      message: "Bạn cần gửi Bearer Token",
    });
  }

  let payload;

  try {
    payload = jwt.verify(parts[1], process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
  } catch {
    return res.status(401).json({
      message: "Token không hợp lệ hoặc đã hết hạn",
    });
  }

  const uid = Number(payload.sub);

  if (!Number.isSafeInteger(uid) || uid <= 0) {
    return res.status(401).json({
      message: "Token không hợp lệ",
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { uid },
      select: userSelect,
    });

    if (!user) {
      return res.status(401).json({
        message: "Tài khoản không còn tồn tại",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error(error.message);

    return res.status(500).json({
      message: "Lỗi hệ thống",
    });
  }
}

// Xem tài khoản đang đăng nhập
router.get("/me", authenticate, (req, res) => {
  res.status(200).json(req.user);
});

module.exports = { router, authenticate };