const express = require("express");
const { z } = require("zod");
const prisma = require("./db");
const { authenticate } = require("./authRoutes");

const router = express.Router();

const idSchema = z.coerce.number()
  .int().min(1).max(2147483647);

const createSchema = z.object({
  oid: z.number().int().min(1).max(2147483647),
}).strict();

const updateSchema = z.object({
  status: z.enum(["PENDING", "SHIPPING", "DELIVERED"]),
}).strict();

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
      message: "Không tìm thấy thông tin giao hàng",
    });
  }

  if (error.code === "P2003") {
    return res.status(404).json({
      message: "Không tìm thấy đơn hàng",
    });
  }

  console.error(error.message);
  return res.status(500).json({
    message: "Lỗi hệ thống",
  });
}

// Các thao tác bên dưới chỉ dành cho admin.
router.use(authenticate, requireAdmin);

// Tạo thông tin giao hàng cho một đơn.
router.post("/", async (req, res) => {
  const result = createSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Dữ liệu giao hàng không hợp lệ",
      errors: result.error.issues,
    });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { oid: result.data.oid },
      select: { oid: true },
    });

    if (!order) {
      return res.status(404).json({
        message: "Không tìm thấy đơn hàng",
      });
    }

    const shipment = await prisma.shipment.create({
      data: {
        oid: order.oid,
        status: "PENDING",
      },
    });

    return res.status(201).json(shipment);
  } catch (error) {
    return handleError(error, res);
  }
});

// Cập nhật trạng thái giao hàng.
router.patch("/:shipid", async (req, res) => {
  const id = idSchema.safeParse(req.params.shipid);
  const data = updateSchema.safeParse(req.body);

  if (!id.success || !data.success) {
    return res.status(400).json({
      message: "Mã hoặc trạng thái giao hàng không hợp lệ",
    });
  }

  try {
    const shipment = await prisma.shipment.update({
      where: { shipid: id.data },
      data: { status: data.data.status },
    });

    return res.status(200).json(shipment);
  } catch (error) {
    return handleError(error, res);
  }
});

module.exports = router;