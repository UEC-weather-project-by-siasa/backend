// src/modules/search/search.service.js

const prisma = require("../../config/db");

const globalSearch = async (query) => {
  if (!query) {
    return {
      devices: [],
      sensors: [],
      users: [],
      list: []
    };
  }

  const search = query.toLowerCase();

  const [devices, sensors, users] = await Promise.all([
    prisma.device.findMany({
      where: {
        OR: [
          { deviceId: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
          { model: { contains: search, mode: "insensitive" } }
        ]
      },
      take: 10,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    }),

    prisma.sensor.findMany({
      where: {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { brand: { contains: search, mode: "insensitive" } },
          { model: { contains: search, mode: "insensitive" } }
        ]
      },
      take: 10
    }),

    prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } }
        ]
      },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    })
  ]);

  // list format
  const list = [
    ...devices.map((d) => ({
      type: "device",
      ...d
    })),

    ...sensors.map((s) => ({
      type: "sensor",
      ...s
    })),

    ...users.map((u) => ({
      type: "user",
      ...u
    }))
  ];

  return {
    devices,
    sensors,
    users,
    list
  };
};

module.exports = {
  globalSearch
};