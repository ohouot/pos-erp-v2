import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const isProduction = config.get<string>("NODE_ENV") === "production";

  // Comme côté Express actuel : ne faire confiance qu'au premier proxy en
  // amont (Caddy, même réseau Docker) pour que req.ip reste l'IP réelle du
  // client derrière le reverse proxy en production.
  if (isProduction) {
    app.getHttpAdapter().getInstance().set("trust proxy", 1);
  }

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: config.get<string>("CLIENT_URL"),
    credentials: true,
  });
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("POS/ERP API")
      .setVersion("2.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api/docs", app, document);
  }

  const port = config.get<number>("PORT") ?? 4100;
  await app.listen(port);
}

bootstrap();
