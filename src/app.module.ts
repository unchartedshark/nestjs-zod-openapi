import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './auth/auth.js';
import { AdminController } from './auth/admin.controller.js';
import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    AuthModule.forRoot({ auth }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      // Required by the integration's global guard for GraphQL requests.
      context: ({ req }: { req: unknown }) => ({ req }),
      graphiql: process.env.NODE_ENV !== 'production',
    }),
    UsersModule,
  ],
  controllers: [AdminController],
})
export class AppModule {}
