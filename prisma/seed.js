require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (
    !username ||
    !password ||
    password.length < 12 ||
    password === "thay_bang_mat_khau_rieng"
  ) {
    throw new Error("Hãy đặt tài khoản và mật khẩu admin trong .env");
  }

  const adminRole = await prisma.role.upsert({
    where: { rolename: "ADMIN" },
    update: {},
    create: { rolename: "ADMIN" },
  });

  await prisma.role.upsert({
    where: { rolename: "CUSTOMER" },
    update: {},
    create: { rolename: "CUSTOMER" },
  });

  const membership = await prisma.memberShip.upsert({
    where: { mname: "STANDARD" },
    update: {},
    create: {
      mname: "STANDARD",
      score: 0,
    },
  });

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { username },
    update: {},
    create: {
      username,
      fullname: "Quản trị viên",
      password: hashedPassword,
      roleid: adminRole.roleid,
      mid: membership.mid,
    },
  });

  console.log("Tạo dữ liệu nền và tài khoản admin thành công!");
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });