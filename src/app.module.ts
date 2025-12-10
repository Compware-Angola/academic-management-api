import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssessmentModule } from './modules/assessment/assessment.module';
import { RoonModule } from './modules/room/roon.module';
import { ExemptDaysModule } from './modules/exempt_days/exempt_days.module';
import { AcademicActivitiesModule } from './modules/academic_activities/academic_activities.module';
import { TeacherModule } from './modules/teacher/teacher.module';
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
}),

    AssessmentModule,
    RoonModule,
    ExemptDaysModule,
    AcademicActivitiesModule,
    TeacherModule,
],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
