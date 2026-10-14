const express = require("express");
const { z } = require("zod");
const prisma = require("./db");
const { authenticate } = require("./authRoutes");

const router = express.Router();

const productSchema = z.object({
  pname: z.string().trim().min(1).max(100),
  price: z.number()
    .finite()
    .min(0)
    .max(99999999.99)
    .refine(
      (value) =>
        Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
      "Giá chỉ được có tối đa 2 chữ số thập phân"
    ),
  quantity: z.number().int().min(0).max(2147483647),
}).strict();

const idSchema = z.coerce.number().int().min(1).max(2147483647);

function requireAdmin(req, res, next) {
  if (req.user.role.rolename !== "ADMIN") {
    return res.status(403).json({
      message: "Chỉ admin được thực hiện chức năng này",
    });
  }

  next();
}

function handleError(error, res) {
  if (error.code === "P2025") {
    return res.status(404).json({
      message: "Không tìm thấy sản phẩm",
    });
  }

  if (error.code === "P2003") {
    return res.status(409).json({
      message: "Sản phẩm đã được sử dụng trong đơn hàng",
    });
  }

  console.error(error.message);

  return res.status(500).json({
    message: "Lỗi hệ thống",
  });
}

// Xem danh sách
router.get("/", async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { pid: "asc" },
    });

    res.status(200).json(products);
  } catch (error) {
    handleError(error, res);
  }
});

// Xem một sản phẩm
router.get("/:pid", async (req, res) => {
  const result = idSchema.safeParse(req.params.pid);

  if (!result.success) {
    return res.status(400).json({
      message: "Mã sản phẩm không hợp lệ",
    });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { pid: result.data },
    });

    if (!product) {
      return res.status(404).json({
        message: "Không tìm thấy sản phẩm",
      });
    }

    res.status(200).json(product);
  } catch (error) {
    handleError(error, res);
  }
});

// Thêm sản phẩm
router.post("/", authenticate, requireAdmin, async (req, res) => {
  const result = productSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Dữ liệu sản phẩm không hợp lệ",
      errors: result.error.issues,
    });
  }

  try {
    const product = await prisma.product.create({
      data: result.data,
    });

    res.status(201).json(product);
  } catch (error) {
    handleError(error, res);
  }
});

// Cập nhật sản phẩm
router.put("/:pid", authenticate, requireAdmin, async (req, res) => {
  const pid = idSchema.safeParse(req.params.pid);
  const data = productSchema.safeParse(req.body);

  if (!pid.success || !data.success) {
    return res.status(400).json({
      message: "Mã hoặc dữ liệu sản phẩm không hợp lệ",
    });
  }

  try {
    const product = await prisma.product.update({
      where: { pid: pid.data },
      data: data.data,
    });

    res.status(200).json(product);
  } catch (error) {
    handleError(error, res);
  }
});

// Xóa sản phẩm
router.delete("/:pid", authenticate, requireAdmin, async (req, res) => {
  const result = idSchema.safeParse(req.params.pid);

  if (!result.success) {
    return res.status(400).json({
      message: "Mã sản phẩm không hợp lệ",
    });
  }

  try {
    await prisma.product.delete({
      where: { pid: result.data },
    });

    res.status(204).end();
  } catch (error) {
    handleError(error, res);
  }
});

module.exports = router;