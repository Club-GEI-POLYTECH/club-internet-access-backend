import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Aligne ticketId / createdById sur UUID pour les jointures TypeORM (ticket.id, user.id).
 */
export class PaymentsUuidFkColumns1747240000000 implements MigrationInterface {
  name = 'PaymentsUuidFkColumns1747240000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payments"
      ALTER COLUMN "ticketId" TYPE uuid USING NULLIF(TRIM("ticketId"::text), '')::uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "payments"
      ALTER COLUMN "createdById" TYPE uuid USING NULLIF(TRIM("createdById"::text), '')::uuid
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payments"
      ALTER COLUMN "ticketId" TYPE character varying USING "ticketId"::text
    `);
    await queryRunner.query(`
      ALTER TABLE "payments"
      ALTER COLUMN "createdById" TYPE character varying USING "createdById"::text
    `);
  }
}
