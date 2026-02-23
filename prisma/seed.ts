import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const restaurant = await prisma.restaurant.create({
    data: {
      name: 'TableTalk Bistro',
      address: '123 Culinary Ave, Food City, FC 90210',
      phone: '(555) 123-4567',
      hoursJson: JSON.stringify({
        Monday: '11:00 AM - 10:00 PM',
        Tuesday: '11:00 AM - 10:00 PM',
        Wednesday: '11:00 AM - 10:00 PM',
        Thursday: '11:00 AM - 11:00 PM',
        Friday: '11:00 AM - 11:00 PM',
        Saturday: '10:00 AM - 11:00 PM',
        Sunday: '10:00 AM - 10:00 PM',
      }),
      policiesJson: JSON.stringify([
        "Greet guests warmly.",
        "Inform guests about the daily special: Grilled Salmon.",
        "We do not take reservations for groups larger than 6 without a deposit.",
        "Vegan options are marked with (V) on the menu.",
        "The kitchen closes 30 minutes before closing time."
      ]),
      patchMode: 'low_score',
      menuItems: {
        create: [
          {
            name: 'Grilled Salmon',
            description: 'Fresh Atlantic salmon with lemon butter sauce and asparagus.',
            price: 24.00,
            allergensJson: JSON.stringify(['Fish', 'Dairy']),
            tagsJson: JSON.stringify(['Gluten-Free', 'Special']),
          },
          {
            name: 'Classic Burger',
            description: 'Angus beef patty, cheddar, lettuce, tomato, brioche bun.',
            price: 16.00,
            allergensJson: JSON.stringify(['Gluten', 'Dairy']),
            tagsJson: JSON.stringify([]),
          },
          {
            name: 'Quinoa Salad',
            description: 'Mixed greens, quinoa, avocado, cherry tomatoes, balsamic vinaigrette.',
            price: 14.00,
            allergensJson: JSON.stringify([]),
            tagsJson: JSON.stringify(['Vegan', 'Gluten-Free']),
          },
        ],
      },
      policyVersions: {
        create: {
          version: 1,
          policyJson: JSON.stringify([
            "Greet guests warmly.",
            "Inform guests about the daily special: Grilled Salmon.",
            "We do not take reservations for groups larger than 6 without a deposit.",
            "Vegan options are marked with (V) on the menu.",
            "The kitchen closes 30 minutes before closing time."
          ]),
          isActive: true,
        },
      },
    },
  })

  console.log({ restaurant })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
