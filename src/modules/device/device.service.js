const prisma = require('../../config/db');
const { randomUUID } = require('crypto');

const generateUniqueDeviceId = async () => {
  let id;
  let exists = true;
  while (exists) {
    id = randomUUID().slice(0, 8); // สั้น 8 ตัว
    const device = await prisma.device.findUnique({ where: { deviceId: id } });
    if (!device) exists = false;
  }
  return id;
};

const generateDeviceKey = () => {
  return Math.random().toString(36).slice(-8); // random 8 ตัวอักษร a-z0-9
};

const createDevice = async (data) => {
  const deviceId = await generateUniqueDeviceId();
  const deviceKey = generateDeviceKey();

  return await prisma.device.create({
    data: {
      ...data,     // name, model, firmware, ownerId
      deviceId,
      deviceKey,
    },
  });
};

const updateDevice = async (id, data) => {
  return await prisma.device.update({
    where: { id: parseInt(id) },
    data,
  });
};

const deleteDevice = async (id) => {
  return await prisma.device.delete({
    where: { id: parseInt(id) },
  });
};

const getAllDevices = async () => {
  return await prisma.device.findMany({
    include: {
      owner: { select: { id: true, name: true, email: true } },
      sensors: { include: { sensor: true } },
    },
  });
};

const getDeviceById = async (id) => {
  return await prisma.device.findUnique({
    where: { id: parseInt(id) },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      sensors: { include: { sensor: true } },
    },
  });
};

// ───────── Sensor Management ─────────
const getSensorById = async (id) => {
  return await prisma.sensor.findUnique({
    where: { id: parseInt(id) },
    include: {
      devices: { include: { device: true } }, 
    },
  });
};

const createSensor = async (data) => {
  return await prisma.sensor.create({ data });
};

const updateSensor = async (id, data) => {
  return await prisma.sensor.update({
    where: { id: parseInt(id) },
    data,
  });
};

const deleteSensor = async (id) => {
  return await prisma.sensor.delete({
    where: { id: parseInt(id) },
  });
};

const getAllSensors = async () => {
  return await prisma.sensor.findMany({
    include: {
      devices: { include: { device: true } },
    },
  });
};

// ───────── DeviceSensor ─────────
const createDeviceSensor = async ({ deviceId, sensorId, alias }) => {
  return await prisma.deviceSensor.create({
    data: {
      deviceId,
      sensorId,
      alias,
    },
  });
};

const updateDeviceSensor = async (id, data) => {
  return await prisma.deviceSensor.update({
    where: { id: parseInt(id) },
    data,
  });
};

const deleteDeviceSensor = async (id) => {
  return await prisma.deviceSensor.delete({
    where: { id: parseInt(id) },
  });
};

const getDeviceSensors = async (deviceId) => {
  return await prisma.deviceSensor.findMany({
    where: { deviceId: parseInt(deviceId) },
    include: { sensor: true },
  });
};


module.exports = {
  createDevice,
  updateDevice,
  deleteDevice,
  getAllDevices,
  getDeviceById,
  getSensorById,
  createSensor,
  updateSensor,
  deleteSensor,
  getAllSensors,
  createDeviceSensor,
  updateDeviceSensor,
  deleteDeviceSensor,
  getDeviceSensors,
};