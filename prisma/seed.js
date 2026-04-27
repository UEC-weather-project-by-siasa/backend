const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

async function main() {
  console.log('🌱 Seeding start...');

  // ───────── Users ─────────
  const hashedPassword = await bcrypt.hash('admin1234', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@admin' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@admin',
      password: hashedPassword,
      role: 'ADMIN',
      profilePicture: '/profilePicture.png',
      setting: {
        create: {
          enableEmailAlert: true,
          enableSystemNoti: true,
        },
      },
    },
  });

  console.log('✅ Admin created:', admin.email);

  // ───────── Sensor ─────────
  const sensors = await Promise.all([
    prisma.sensor.upsert({
      where: { name: 'temperature' },
      update: {},
      create: {
        name: 'temperature',
        unit: '°C',
        model: 'DHT22',
        brand: 'Generic',
      },
    }),
    prisma.sensor.upsert({
      where: { name: 'humidity' },
      update: {},
      create: {
        name: 'humidity',
        unit: '%',
        model: 'DHT22',
        brand: 'Generic',
      },
    }),
    prisma.sensor.upsert({
      where: { name: 'pressure' },
      update: {},
      create: {
        name: 'pressure',
        unit: 'hPa',
        model: 'BMP280',
        brand: 'Bosch',
      },
    }),
    prisma.sensor.upsert({
      where: { name: 'wind_speed' },
      update: {},
      create: {
        name: 'wind_speed',
        unit: 'm/s',
        model: 'Anemometer',
        brand: 'Generic',
      },
    }),
    prisma.sensor.upsert({
      where: { name: 'wind_direction' },
      update: {},
      create: {
        name: 'wind_direction',
        unit: 'deg',
        model: 'Wind Vane',
        brand: 'Generic',
      },
    }),
  
  ]);

  
  console.log('✅ Sensors created');

  // ───────── Device ─────────
  const device = await prisma.device.upsert({
    where: { deviceId: 'test_iot' },
    update: {},
    create: {
      deviceId: 'test_iot',
      deviceKey: 'Sia18037',
      name: 'Test Weather Device',
      isOnline: false,
      ownerId: admin.id,
    },
  });

  console.log('✅ Device created');

  // ───────── Mapping ─────────
  for (const sensor of sensors) {
    await prisma.deviceSensor.upsert({
      where: {
        deviceId_sensorId: {
          deviceId: device.id,
          sensorId: sensor.id,
        },
      },
      update: {},
      create: {
        deviceId: device.id,
        sensorId: sensor.id,
      },
    });
  }

  console.log('🎉 Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });