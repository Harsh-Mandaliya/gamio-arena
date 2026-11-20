import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export const badRequest = (msg, fields) => new HttpError(400, msg, fields);
export const unauthorized = (msg = 'Please sign in to continue') => new HttpError(401, msg);
export const forbidden = (msg = "You don't have access to that") => new HttpError(403, msg);
export const notFound = (what = 'Page') => new HttpError(404, `${what} not found`);
export const conflict = (msg) => new HttpError(409, msg);

export function notFoundHandler(req, res) {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    const fields = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_';
      fields[key] ??= issue.message;
    }
    return res.status(400).json({ error: 'Some fields need another look', fields });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...(err.fields && { fields: err.fields }) });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }

  if (typeof err.message === 'string' && err.message.includes('UNIQUE constraint failed')) {
    return res.status(409).json({ error: 'That already exists' });
  }

  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side' });
}
