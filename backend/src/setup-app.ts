import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

/** Everything that makes the app "the app" - shared by main.ts and the e2e tests. */
export function setupApp(app: INestApplication, opts: { swagger?: boolean } = {}) {
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  if (opts.swagger) {
    const doc = new DocumentBuilder()
      .setTitle('Sampath Food City API')
      .setDescription('E-commerce & store management REST API (demo portfolio project)')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, doc));
  }
  return app;
}
