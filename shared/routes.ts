import { z } from 'zod';
import { insertTaskSchema, insertShopItemSchema, insertScheduleItemSchema, tasks, shopItems, inventory, scheduleItems, userStats } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  })
};

export const api = {
  userStats: {
    get: {
      method: 'GET' as const,
      path: '/api/user-stats',
      responses: {
        200: z.custom<typeof userStats.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    }
  },
  tasks: {
    list: {
      method: 'GET' as const,
      path: '/api/tasks',
      responses: {
        200: z.array(z.custom<typeof tasks.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/tasks',
      input: insertTaskSchema,
      responses: {
        201: z.custom<typeof tasks.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/tasks/:id',
      input: insertTaskSchema.partial(),
      responses: {
        200: z.custom<typeof tasks.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/tasks/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    complete: {
      method: 'POST' as const,
      path: '/api/tasks/:id/complete',
      responses: {
        200: z.object({
          task: z.custom<typeof tasks.$inferSelect>(),
          stats: z.custom<typeof userStats.$inferSelect>(),
          leveledUp: z.boolean(),
        }),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    }
  },
  shop: {
    list: {
      method: 'GET' as const,
      path: '/api/shop',
      responses: {
        200: z.array(z.custom<typeof shopItems.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/shop',
      input: insertShopItemSchema,
      responses: {
        201: z.custom<typeof shopItems.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    buy: {
      method: 'POST' as const,
      path: '/api/shop/:id/buy',
      responses: {
        200: z.object({
          item: z.custom<typeof inventory.$inferSelect>(),
          stats: z.custom<typeof userStats.$inferSelect>(),
        }),
        400: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    }
  },
  inventory: {
    list: {
      method: 'GET' as const,
      path: '/api/inventory',
      responses: {
        200: z.array(z.object({
          inventoryId: z.number(),
          item: z.custom<typeof shopItems.$inferSelect>(),
          acquiredAt: z.string(),
          isUsed: z.boolean(),
          usedAt: z.string().nullable(),
        })),
        401: errorSchemas.unauthorized,
      },
    },
    use: {
      method: 'POST' as const,
      path: '/api/inventory/:id/use',
      responses: {
        200: z.custom<typeof inventory.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/inventory/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    }
  },
  schedule: {
    list: {
      method: 'GET' as const,
      path: '/api/schedule',
      responses: {
        200: z.array(z.custom<typeof scheduleItems.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/schedule',
      input: insertScheduleItemSchema,
      responses: {
        201: z.custom<typeof scheduleItems.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/schedule/:id',
      input: insertScheduleItemSchema.partial(),
      responses: {
        200: z.custom<typeof scheduleItems.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/schedule/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
