import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
            details: error.errors,
          },
        });
        return;
      }
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'Invalid payload format' },
      });
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.query = (await schema.parseAsync(req.query)) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'QUERY_VALIDATION_ERROR',
            message: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
          },
        });
        return;
      }
      next(error);
    }
  };
}
