import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { UserMessage } from '../interfaces/kafka-message.interface';
import { UserRole } from '../../entities/user.entity';

@Injectable()
export class UserConsumer {
  private readonly logger = new Logger(UserConsumer.name);

  constructor(private usersService: UsersService) {}

  async handleMessage(message: UserMessage): Promise<void> {
    this.logger.log(`📥 Received user event: ${message.event}`);

    try {
      switch (message.event) {
        case 'user.created':
          await this.handleUserCreated(message);
          break;
        case 'user.updated':
          await this.handleUserUpdated(message);
          break;
        case 'user.deleted':
          await this.handleUserDeleted(message);
          break;
        case 'user.activated':
          await this.handleUserActivated(message);
          break;
        case 'user.deactivated':
          await this.handleUserDeactivated(message);
          break;
        default:
          this.logger.warn(`⚠️ Unknown user event: ${message.event}`);
      }
    } catch (error) {
      this.logger.error(`❌ Error handling user message: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleUserCreated(message: UserMessage): Promise<void> {
    const { data } = message;

    if (!data.email) {
      this.logger.warn('⚠️ Email is required for user creation');
      return;
    }

    // Vérifier si l'utilisateur existe déjà
    try {
      const existingUser = await this.usersService.findByEmail(data.email);
      if (existingUser) {
        this.logger.log(`ℹ️ User with email ${data.email} already exists, skipping creation`);
        return;
      }
    } catch (error) {
      // L'utilisateur n'existe pas, on continue
    }

    // Créer un nouvel utilisateur
    const user = await this.usersService.create({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      role: (data.role as UserRole) || UserRole.STUDENT,
      isActive: data.isActive !== undefined ? data.isActive : true,
    });

    this.logger.log(`✅ User created from Kafka: ${user.email}`);
  }

  private async handleUserUpdated(message: UserMessage): Promise<void> {
    const { data } = message;

    if (!data.id && !data.email) {
      this.logger.warn('⚠️ User ID or email required for update');
      return;
    }

    let user;
    if (data.id) {
      user = await this.usersService.findOne(data.id);
    } else if (data.email) {
      user = await this.usersService.findByEmail(data.email);
    }

    if (!user) {
      this.logger.warn(`⚠️ User not found: ${data.id || data.email}`);
      return;
    }

    // Mettre à jour l'utilisateur
    const updateData: any = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.role !== undefined) updateData.role = data.role as UserRole;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.password !== undefined) updateData.password = data.password;

    await this.usersService.update(user.id, updateData);
    this.logger.log(`✅ User updated from Kafka: ${user.email}`);
  }

  private async handleUserDeleted(message: UserMessage): Promise<void> {
    const { data } = message;

    if (!data.id && !data.email) {
      this.logger.warn('⚠️ User ID or email required for deletion');
      return;
    }

    try {
      let user;
      if (data.id) {
        user = await this.usersService.findOne(data.id);
      } else if (data.email) {
        user = await this.usersService.findByEmail(data.email);
      }

      if (user) {
        await this.usersService.remove(user.id);
        this.logger.log(`✅ User deleted from Kafka: ${user.email}`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to delete user: ${error.message}`);
    }
  }

  private async handleUserActivated(message: UserMessage): Promise<void> {
    const { data } = message;

    if (!data.id && !data.email) {
      this.logger.warn('⚠️ User ID or email required for activation');
      return;
    }

    let user;
    if (data.id) {
      user = await this.usersService.findOne(data.id);
    } else if (data.email) {
      user = await this.usersService.findByEmail(data.email);
    }

    if (!user) {
      this.logger.warn(`⚠️ User not found: ${data.id || data.email}`);
      return;
    }

    await this.usersService.update(user.id, { isActive: true });
    this.logger.log(`✅ User activated from Kafka: ${user.email}`);
  }

  private async handleUserDeactivated(message: UserMessage): Promise<void> {
    const { data } = message;

    if (!data.id && !data.email) {
      this.logger.warn('⚠️ User ID or email required for deactivation');
      return;
    }

    let user;
    if (data.id) {
      user = await this.usersService.findOne(data.id);
    } else if (data.email) {
      user = await this.usersService.findByEmail(data.email);
    }

    if (!user) {
      this.logger.warn(`⚠️ User not found: ${data.id || data.email}`);
      return;
    }

    await this.usersService.update(user.id, { isActive: false });
    this.logger.log(`✅ User deactivated from Kafka: ${user.email}`);
  }
}
