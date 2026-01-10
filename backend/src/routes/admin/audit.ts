import { Router } from 'express';
import { prisma } from '../../utils/database.js';

const router = Router();

/**
 * GET /api/admin/audit
 * Get audit logs with filtering and pagination
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      action,
      entityType,
      userId,
      startDate,
      endDate,
      page = '1',
      limit = '50',
    } = req.query;

    const where: Record<string, unknown> = {};

    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (userId) where.userId = userId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(startDate as string);
      }
      if (endDate) {
        (where.createdAt as Record<string, unknown>).lte = new Date(endDate as string);
      }
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, username: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      logs,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/audit/actions
 * Get list of unique action types
 */
router.get('/actions', async (req, res, next) => {
  try {
    const actions = await prisma.auditLog.findMany({
      distinct: ['action'],
      select: { action: true },
      orderBy: { action: 'asc' },
    });

    res.json({ actions: actions.map(a => a.action) });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/audit/entity-types
 * Get list of unique entity types
 */
router.get('/entity-types', async (req, res, next) => {
  try {
    const entityTypes = await prisma.auditLog.findMany({
      distinct: ['entityType'],
      select: { entityType: true },
      orderBy: { entityType: 'asc' },
    });

    res.json({ entityTypes: entityTypes.map(e => e.entityType) });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/audit/export
 * Export audit logs as JSON
 */
router.get('/export', async (req, res, next) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;

    const where: Record<string, unknown> = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(startDate as string);
      }
      if (endDate) {
        (where.createdAt as Record<string, unknown>).lte = new Date(endDate as string);
      }
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { username: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (format === 'csv') {
      // Generate CSV
      const csvHeader = 'ID,Timestamp,User,Action,EntityType,EntityID,Details,IP\n';
      const csvRows = logs.map(log => 
        `"${log.id}","${log.createdAt.toISOString()}","${log.user?.username || 'System'}","${log.action}","${log.entityType}","${log.entityId || ''}","${JSON.stringify(log.details || {}).replace(/"/g, '""')}","${log.ipAddress || ''}"`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      return res.send(csvHeader + csvRows);
    }

    // Default to JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.json`);
    res.json({ logs });
  } catch (error) {
    next(error);
  }
});

export default router;

