import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketType } from '../entities/ticket-type.entity';
import { Ticket, TicketStatus } from '../entities/ticket.entity';

@Injectable()
export class TicketTypesService {
  private readonly logger = new Logger(TicketTypesService.name);

  constructor(
    @InjectRepository(TicketType)
    private ticketTypesRepository: Repository<TicketType>,
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
  ) {}

  async findAll(): Promise<TicketType[]> {
    this.logger.log('findAll ticket types');
    return await this.ticketTypesRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findAllWithCounts(): Promise<any[]> {
    this.logger.log('findAllWithCounts ticket types');
    const types = await this.findAll();
    const typesWithCounts = await Promise.all(
      types.map(async (type) => {
        const availableCount = await this.ticketsRepository.count({
          where: {
            ticketTypeId: type.id,
            status: TicketStatus.AVAILABLE,
          },
        });

        return {
          ...type,
          availableCount,
        };
      }),
    );

    return typesWithCounts;
  }

  async findOne(id: string): Promise<TicketType> {
    this.logger.log(`findOne ticket type id=${id}`);
    return await this.ticketTypesRepository.findOne({
      where: { id },
    });
  }

  async findOneWithCount(id: string): Promise<TicketType & { availableCount: number }> {
    this.logger.log(`findOneWithCount ticket type id=${id}`);
    const type = await this.ticketTypesRepository.findOne({
      where: { id },
    });
    if (!type) {
      throw new NotFoundException('Ticket type not found');
    }
    const availableCount = await this.ticketsRepository.count({
      where: {
        ticketTypeId: id,
        status: TicketStatus.AVAILABLE,
      },
    });
    return { ...type, availableCount };
  }

  async findByProfile(profile: string): Promise<TicketType | null> {
    this.logger.log(`findByProfile ticket type profile=${profile}`);
    return await this.ticketTypesRepository.findOne({
      where: { profile, isActive: true },
    });
  }

  async create(ticketTypeData: Partial<TicketType>): Promise<TicketType> {
    this.logger.log(`create ticket type profile=${ticketTypeData?.profile}`);
    const ticketType = this.ticketTypesRepository.create(ticketTypeData);
    return await this.ticketTypesRepository.save(ticketType);
  }

  async update(id: string, ticketTypeData: Partial<TicketType>): Promise<TicketType> {
    this.logger.log(`update ticket type id=${id}`);
    await this.ticketTypesRepository.update(id, ticketTypeData);
    return await this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`remove ticket type id=${id}`);
    await this.ticketTypesRepository.delete(id);
  }
}
