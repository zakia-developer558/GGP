import { MigrationInterface, QueryRunner } from "typeorm";

export class UsersSchemaChanges1750168735105 implements MigrationInterface {
    name = 'UsersSchemaChanges1750168735105'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "SubscriptionPlan" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "duration" character varying NOT NULL, "price" numeric(10,2) NOT NULL, "description" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), CONSTRAINT "PK_2a96f422dd8968c2461b60c0fae" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "UserSubscription" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "startDate" TIMESTAMP WITH TIME ZONE NOT NULL, "endDate" TIMESTAMP WITH TIME ZONE NOT NULL, "status" character varying NOT NULL DEFAULT 'active', "paymentId" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "userId" uuid NOT NULL, "planId" uuid NOT NULL, CONSTRAINT "PK_67f6e0bbb608db7a14aa7fe89df" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "Product" DROP CONSTRAINT "unique_websiteurl"`);
        await queryRunner.query(`ALTER TABLE "UserSubscription" ADD CONSTRAINT "FK_f8306d1e79b3b81875f66085be6" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "UserSubscription" ADD CONSTRAINT "FK_3d148171f4360e9c53cee8eff0a" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "UserSubscription" DROP CONSTRAINT "FK_3d148171f4360e9c53cee8eff0a"`);
        await queryRunner.query(`ALTER TABLE "UserSubscription" DROP CONSTRAINT "FK_f8306d1e79b3b81875f66085be6"`);
        await queryRunner.query(`ALTER TABLE "Product" ADD CONSTRAINT "unique_websiteurl" UNIQUE ("websiteUrl")`);
        await queryRunner.query(`DROP TABLE "UserSubscription"`);
        await queryRunner.query(`DROP TABLE "SubscriptionPlan"`);
    }

}
