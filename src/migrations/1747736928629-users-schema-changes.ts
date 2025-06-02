import { MigrationInterface, QueryRunner } from "typeorm";

export class UsersSchemaChanges1747736928629 implements MigrationInterface {
    name = 'UsersSchemaChanges1747736928629'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "User" ADD "completedSignup" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`CREATE TYPE "public"."User_authprovider_enum" AS ENUM('GOOGLE', 'FACEBOOK', 'TWITTER', 'EMAIL')`);
        await queryRunner.query(`ALTER TABLE "User" ADD "authProvider" "public"."User_authprovider_enum"`);
        await queryRunner.query(`ALTER TABLE "User" ALTER COLUMN "firstName" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "User" ALTER COLUMN "lastName" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "User" ALTER COLUMN "lastName" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "User" ALTER COLUMN "firstName" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "User" DROP COLUMN "authProvider"`);
        await queryRunner.query(`DROP TYPE "public"."User_authprovider_enum"`);
        await queryRunner.query(`ALTER TABLE "User" DROP COLUMN "completedSignup"`);
    }

}
