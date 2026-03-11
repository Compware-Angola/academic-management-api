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
import { ScheduleModule } from './modules/schedule/schedule.module';
import { HistoryNoteReleaseService } from './modules/assessment/history_note_release.service';
import { AcessManagementModule } from './modules/acess_management/acess_management.module';
import { AcademicCalendarModule } from './modules/academic_calendar/academic_calendar.module';
import { TeamOldRulesModule } from './modules/team_old_rules/team_old_rules.module';
import { HttpModule } from '@nestjs/axios';
import { StudentsModule } from './modules/students/students.module';
import { DisciplineModule } from './modules/discipline/discipline.module';
import { EnrollmentModule } from './modules/enrollment/enrollment.module';
import { SuporteModule } from './modules/suporte/suporte.module';
import { AssiduidadeModule } from './modules/assiduidade/assiduidade.module';
import { DocentesModule } from './modules/docentes/docentes.module';

import { DefenseManagementTfcModule } from './modules/defense-management-tfc/defense-management-tfc.module';
import { SumarioModule } from './modules/sumario/sumario.module';
import { BullConfigModule } from './modules/bull/bull.module';
import { DocenteGestaoModule } from './modules/docente_gestao/docente_gestao.module';
import { PlanoEstudoModule } from './modules/plano_estudo/plano_estudo.module';
import { DropdownFiltersModule } from './modules/shared/dropdown_filters/dropdown_filters.module';


@Module({
  imports: [
       ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: (() => {
        switch (process.env.NODE_ENV) {
          case 'production':
            return '.env.prod';       
          case 'preprod':
            return '.env.preprod';    
          default:
            return '.env.dev';        
        }
      })(),
    }),
    HttpModule,
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
    ScheduleModule,
    AcessManagementModule,
    AcademicCalendarModule,
    TeamOldRulesModule,
    StudentsModule,
    DisciplineModule,
    EnrollmentModule,
    EnrollmentModule,
    SuporteModule,
    AssiduidadeModule,
    DocentesModule,
    DefenseManagementTfcModule,
    SumarioModule,
    BullConfigModule,
    DocenteGestaoModule,
    PlanoEstudoModule,
    DropdownFiltersModule,
  ],
  controllers: [AppController],
  providers: [AppService, HistoryNoteReleaseService],
})
export class AppModule {}
