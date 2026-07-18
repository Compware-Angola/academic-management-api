import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssessmentModule } from './modules/assessment/assessment.module';
import { RoonModule } from './modules/room/roon.module';
import { ExemptDaysModule } from './modules/exempt_days/exempt_days.module';
import { AcademicActivitiesModule } from './modules/academic_activities/academic_activities.module';
import { TeacherModule } from './modules/users/users.module';
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
import { ExamesDeAcessoModule } from './modules/exames-de-acesso/exames-de-acesso.module';
import { StatisticsReportsModule } from './modules/shared/statistics-reports/statistics-reports.module';
import { RegistrationModule } from './modules/registration/registration.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core/constants';
import { CustomThrottlerGuard } from './common/guard/Custom-Throttler.guard';
import { CursosModule } from './modules/cursos/cursos.module';

import { DocumentsModule } from './modules/shared/documents/documents.module';
import { TopicosModule } from './modules/topicos/topicos.module';
import { PerguntasModule } from './modules/perguntas/perguntas.module';
import { ProvasModule } from './modules/provas/provas.module';
import { VagasModule } from './modules/vagas/vagas.module';
import { PrazosModule } from './modules/prazos/prazos.module';
import { ScriptModule } from './modules/script/script.module';
import { PostGraduationModule } from './modules/post-graduation/post-graduation.module';
import { StatisModule } from './modules/stats/stats.module';

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
    /*
     ThrottlerModule.forRoot([
      {
        ttl: 2000, 
        limit: 40,   
      },
    ]),
    */
    HttpModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isSSL = config.get<string>('DB_SSL') === 'true';

        // ✅ Garantir timezone antes da criação da pool Oracle
        process.env.TZ = config.get<string>('TZ') || 'Africa/Luanda';
        process.env.ORA_SDTZ = config.get<string>('ORA_SDTZ') || 'Africa/Luanda';

        return {
          type: 'oracle' as const,
          host: config.get<string>('DB_HOST'),
          port: config.get<number>('DB_PORT', 1521),
          username: config.get<string>('DB_USERNAME'),
          password: config.get<string>('DB_PASSWORD'),
          sid: config.get<string>('DB_SID'),
          timezone: config.get<string>('TZ') || 'Africa/Luanda',


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
    ExamesDeAcessoModule,
    StatisticsReportsModule,
    RegistrationModule,
    CursosModule,
    DocumentsModule,
    TopicosModule,
    PerguntasModule,
    ProvasModule,
    VagasModule,
    PrazosModule,
    ScriptModule,
    PostGraduationModule,


    StatisModule

  ],
  controllers: [AppController],
  providers: [AppService, HistoryNoteReleaseService,

    /*
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard, 
    },
    */


  ],
})
export class AppModule { }
