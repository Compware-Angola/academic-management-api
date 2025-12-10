import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
@Module({
  imports: [ ConfigModule.forRoot({
      isGlobal: true,
    }),
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const isSSL = config.get<string>('DB_SSL') === 'true';

    return {
      type: 'oracle' as const,
      host: config.get<string>('DB_HOST'),
      port: config.get<number>('DB_PORT', 1521),
      username: config.get<string>('DB_USERNAME'),
      password: config.get<string>('DB_PASSWORD'),
      sid: config.get<string>('DB_SID'),

      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false,
      logging: ['query', 'error'],

      extra: {
        disableInsertDefaultValues: true,
        ...(isSSL ? { ssl: { rejectUnauthorized: true } } : {}),
      },
    };
  },
}),],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
