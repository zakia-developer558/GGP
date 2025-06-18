import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPaymentStatusToSubscription1750168735106 implements MigrationInterface {
    name = 'AddPaymentStatusToSubscription1750168735106'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "UserSubscription" ADD COLUMN "paymentStatus" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "UserSubscription" DROP COLUMN "paymentStatus"`);
    }
} 