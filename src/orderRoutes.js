const express = require("express");
const { z } = require("zod");
const prisma = require("./db");
const { authenticate } = require("./authRoutes");

const router = express.Router();

const idSchema = z.coerce.number().int().min(1).max(2147483647);

const orderSchema = z.object({
  items: z.array(
    z.object({
      pid: z.number().int().min(1).max(2147483647),
      qty: z.number().int().min(1).max(2147483647),
    }).strict()
  ).min(1).max(20),
}).strict().refine(
  (data) => new Set(data.items.map((item) => item.pid)).size
    === data.items.length,
  { message: "Không được lặp mã sản phẩm trong đơn hàng" }
);

const orderInclude = {
  details: {
    include: {
      product: {
        select: {
          pid: true,
          pname: true,
        },
      },
    },
  },
  shipments: true,
};

function businessError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function handleError(error, res) {
  if (error.status) {
    return res.status(error.status).json({
      message: error.message,
    });
  }

  if (error.code === "P2034") {
    return res.status(409).json({
      message: "Dữ liệu đang được cập nhật, hãy thử lại",
    });
  }

  console.error(error.message);
  return res.status(500).json({
    message: "Lỗi hệ thống",
  });
}

// Tất cả API đơn hàng đều yêu cầu đăng nhập.
router.use(authenticate);

// Tạo đơn hàng.
router.post("/", async (req, res) => {
  const result = orderSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Dữ liệu đơn hàng không hợp lệ",
      errors: result.error.issues,
    });
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const items = [...result.data.items]
        .sort((a, b) => a.pid - b.pid);

      const details = [];

      for (const item of items) {
        // Chỉ trừ kho khi còn đủ số lượng.
        const updated = await tx.product.updateMany({
          where: {
            pid: item.pid,
            quantity: { gte: item.qty },
          },
          data: {
            quantity: { decrement: item.qty },
          },
        });

        if (updated.count === 0) {
          const product = await tx.product.findUnique({
            where: { pid: item.pid },
          });

          if (!product) {
            throw businessError(
              404,
              `Không tìm thấy sản phẩm ${item.pid}`
            );
          }

          throw businessError(
            409,
            `Sản phẩm ${item.pid} không đủ tồn kho`
          );
        }

        // Lấy giá từ database, không nhận giá từ khách hàng.
        const product = await tx.product.findUnique({
          where: { pid: item.pid },
        });

        details.push({
          pid: item.pid,
          qty: item.qty,
          unit_price: product.price,
        });
      }

      return tx.order.create({
        data: {
          uid: req.user.uid,
          details: {
            create: details,
          },
        },
        include: orderInclude,
      });
    }, {
      isolationLevel: "Serializable",
      maxWait: 5000,
      timeout: 10000,
    });

    return res.status(201).json(order);
  } catch (error) {
    return handleError(error, res);
  }
});

// Admin xem tất cả; khách hàng xem đơn của mình.
router.get("/", async (req, res) => {
  try {
    const isAdmin = req.user.role.rolename === "ADMIN";

    const orders = await prisma.order.findMany({
      where: isAdmin ? {} : { uid: req.user.uid },
      include: orderInclude,
      orderBy: { oid: "desc" },
    });

    return res.status(200).json(orders);
  } catch (error) {
    return handleError(error, res);
  }
});

// Xem chi tiết một đơn hàng.
router.get("/:oid", async (req, res) => {
  const result = idSchema.safeParse(req.params.oid);

  if (!result.success) {
    return res.status(400).json({
      message: "Mã đơn hàng không hợp lệ",
    });
  }

  try {
    const isAdmin = req.user.role.rolename === "ADMIN";

    const order = await prisma.order.findFirst({
      where: {
        oid: result.data,
        ...(isAdmin ? {} : { uid: req.user.uid }),
      },
      include: orderInclude,
    });

    if (!order) {
      return res.status(404).json({
        message: "Không tìm thấy đơn hàng",
      });
    }

    return res.status(200).json(order);
  } catch (error) {
    return handleError(error, res);
  }
});

module.exports = router;