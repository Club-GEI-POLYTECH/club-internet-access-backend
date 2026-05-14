import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Retire la valeur `cash` de l’enum PostgreSQL `payments_method_enum` (TypeORM par défaut).
 * Les lignes encore en `cash` passent en `mobile_money` avant recréation du type.
 */
export class DropPaymentMethodCash1747228800000 implements MigrationInterface {
  name = 'DropPaymentMethodCash1747228800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "payments" SET "method" = 'mobile_money' WHERE "method" = 'cash'`);

    await queryRunner.query(`ALTER TYPE "payments_method_enum" RENAME TO "payments_method_enum_old"`);
    await queryRunner.query(`CREATE TYPE "payments_method_enum" AS ENUM ('mobile_money', 'card')`);
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "method" TYPE "payments_method_enum" USING "method"::text::"payments_method_enum"`,
    );
    await queryRunner.query(`DROP TYPE "payments_method_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "payments_method_enum" RENAME TO "payments_method_enum_new"`);
    await queryRunner.query(`CREATE TYPE "payments_method_enum" AS ENUM ('mobile_money', 'card', 'cash')`);
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "method" TYPE "payments_method_enum" USING "method"::text::"payments_method_enum"`,
    );
    await queryRunner.query(`DROP TYPE "payments_method_enum_new"`);
  }
}
