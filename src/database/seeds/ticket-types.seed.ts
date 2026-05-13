import { DataSource } from 'typeorm';
import { TicketType } from '../../entities/ticket-type.entity';

type DurationType = {
  name: string;
  profile: string;
  timeLimit: string;
  price: number;
  description: string;
};

export async function seedTicketTypes(dataSource: DataSource) {
  const ticketTypeRepository = dataSource.getRepository(TicketType);

  const durationTypes: DurationType[] = [
    {
      name: '24 heures',
      profile: 'DURATION_24H',
      timeLimit: '24h',
      price: Number(process.env.TICKET_PRICE_24H ?? 1000),
      description: 'Type standard 24 heures',
    },
    {
      name: '7 jours',
      profile: 'DURATION_7J',
      timeLimit: '7d',
      price: Number(process.env.TICKET_PRICE_7D ?? 3500),
      description: 'Type standard 7 jours',
    },
    {
      name: '30 jours',
      profile: 'DURATION_30J',
      timeLimit: '30d',
      price: Number(process.env.TICKET_PRICE_30D ?? 9000),
      description: 'Type standard 30 jours',
    },
  ];

  console.log('🌱 Seeding ticket types (24h / 7j / 30j)...');
  for (const durationType of durationTypes) {
    const existing = await ticketTypeRepository.findOne({
      where: { profile: durationType.profile },
    });

    if (!existing) {
      await ticketTypeRepository.save(
        ticketTypeRepository.create({
          ...durationType,
          isActive: true,
          dataLimit: null,
        }),
      );
      console.log(`✅ Type créé: ${durationType.name} (${durationType.profile})`);
      continue;
    }

    existing.name = durationType.name;
    existing.timeLimit = durationType.timeLimit;
    existing.price = durationType.price;
    existing.description = durationType.description;
    existing.isActive = true;
    await ticketTypeRepository.save(existing);
    console.log(`♻️ Type mis à jour: ${durationType.name} (${durationType.profile})`);
  }
}
