import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CorrelatedRequest } from './correlation-id.middleware';

interface ValidationField {
  readonly path: string;
  readonly code: string;
}

interface ErrorDetail {
  readonly code?: string;
  readonly message?: string | string[];
  readonly fields?: readonly ValidationField[];
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<CorrelatedRequest & Request>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const detail = this.getDetail(exception);

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        'Unhandled API exception',
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      error: {
        code: detail.code ?? statusCode(status),
        message: normalizeMessage(detail.message, status),
        fields: detail.fields ?? [],
        correlationId: request.correlationId,
      },
    });
  }

  private getDetail(exception: unknown): ErrorDetail {
    if (!(exception instanceof HttpException)) return {};
    const response = exception.getResponse();
    return typeof response === 'string' ? { message: response } : response;
  }
}

function normalizeMessage(
  message: string | string[] | undefined,
  status: number,
): string {
  if (Array.isArray(message)) return message.join('; ');
  if (message) return message;
  return status === 500
    ? 'An unexpected server error occurred.'
    : 'The request could not be completed.';
}

function statusCode(status: number): string {
  return HttpStatus[status] ?? 'HTTP_ERROR';
}
