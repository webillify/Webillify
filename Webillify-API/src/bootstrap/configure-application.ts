import {
  INestApplication,
  UnprocessableEntityException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ApiEnvironment } from '../config/environment';
import { ApiExceptionFilter } from '../core/http/api-exception.filter';
import { CorrelationIdMiddleware } from '../core/http/correlation-id.middleware';

interface ConfigureOptions {
  readonly swagger?: boolean;
}

export function configureApplication(
  app: INestApplication,
  options: ConfigureOptions = {},
): void {
  const config = app.get<ConfigService<ApiEnvironment, true>>(ConfigService);
  const origins = config
    .get('CORS_ORIGINS', { infer: true })
    .split(',')
    .map((origin) => origin.trim());

  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();
  const correlationIds = new CorrelationIdMiddleware();
  app.use(correlationIds.use.bind(correlationIds));
  app.use(cookieParser());
  app.use(helmet());
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Organization-Id',
      'X-Correlation-Id',
      'Idempotency-Key',
    ],
    exposedHeaders: ['X-Correlation-Id'],
  });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: false,
      exceptionFactory: (errors) => validationException(errors),
    }),
  );

  if (options.swagger !== false) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Webillify API')
        .setDescription(
          'Versioned Webillify billing, inventory and AI add-on API',
        )
        .setVersion('1.0')
        .addBearerAuth()
        .addApiKey(
          { type: 'apiKey', in: 'header', name: 'X-Organization-Id' },
          'organization',
        )
        .build(),
    );
    SwaggerModule.setup('api/docs', app, document, {
      jsonDocumentUrl: 'api/docs/openapi.json',
    });
  }
}

function validationException(
  errors: ValidationError[],
): UnprocessableEntityException {
  const fields = flattenErrors(errors);
  return new UnprocessableEntityException({
    code: 'VALIDATION_FAILED',
    message: 'One or more request fields are invalid.',
    fields,
  });
}

function flattenErrors(
  errors: ValidationError[],
  parent = '',
): Array<{ path: string; code: string }> {
  return errors.flatMap((error) => {
    const path = parent ? `${parent}.${error.property}` : error.property;
    const own = Object.keys(error.constraints ?? {}).map((code) => ({
      path,
      code,
    }));
    return [...own, ...flattenErrors(error.children ?? [], path)];
  });
}
