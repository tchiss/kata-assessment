import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageFile = fs.readFileSync(packagePath, 'utf-8');
  const packageJson = JSON.parse(packageFile);

  const config = new DocumentBuilder()
    .setTitle('Kata API')
    .setDescription('Kata API')
    .setVersion(packageJson.version)
    .addTag('Routes')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'Kata API Documentation',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );
  app.enableCors();

  await app.listen(3400);
}
bootstrap();
