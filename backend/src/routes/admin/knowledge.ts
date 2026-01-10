import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import { prisma } from '../../utils/database.js';
import { BadRequestError, NotFoundError, ConflictError } from '../../middleware/errorHandler.js';
import { logAudit, AuditActions } from '../../middleware/auditLogger.js';
import { KnowledgeMode, FolderStatus } from '@prisma/client';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.doc', '.pptx', '.ppt', '.txt', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not supported`));
    }
  },
});

// ============================================
// FOLDERS
// ============================================

/**
 * GET /api/admin/knowledge/folders
 * List all folders (tree structure)
 */
router.get('/folders', async (req, res, next) => {
  try {
    const { flat } = req.query;

    if (flat === 'true') {
      // Return flat list
      const folders = await prisma.folder.findMany({
        include: {
          _count: {
            select: { documents: true },
          },
        },
        orderBy: { path: 'asc' },
      });
      return res.json({ folders });
    }

    // Return tree structure (only root folders)
    const folders = await prisma.folder.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: {
              include: {
                children: true,
                _count: { select: { documents: true } },
              },
            },
            _count: { select: { documents: true } },
          },
        },
        _count: { select: { documents: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ folders });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/knowledge/folders/:id
 * Get folder details
 */
router.get('/folders/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const folder = await prisma.folder.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          include: {
            _count: { select: { documents: true } },
          },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        userFolders: {
          include: {
            user: {
              select: { id: true, username: true, firstName: true, lastName: true },
            },
          },
        },
        groupFolders: {
          include: {
            group: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!folder) {
      throw NotFoundError('Folder');
    }

    res.json({ folder });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/knowledge/folders
 * Create new folder
 */
router.post(
  '/folders',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('path').trim().notEmpty().withMessage('Path is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw BadRequestError(errors.array()[0].msg);
      }

      const { name, path: folderPath, description, parentId, knowledgeMode, promptOverride } = req.body;

      // Check if path exists
      const existing = await prisma.folder.findUnique({ where: { path: folderPath } });
      if (existing) {
        throw ConflictError('Folder path already exists');
      }

      // Validate parent if provided
      if (parentId) {
        const parent = await prisma.folder.findUnique({ where: { id: parentId } });
        if (!parent) {
          throw BadRequestError('Parent folder not found');
        }
      }

      const folder = await prisma.folder.create({
        data: {
          name,
          path: folderPath,
          description,
          parentId,
          knowledgeMode: knowledgeMode || KnowledgeMode.HYBRID,
          promptOverride,
        },
      });

      await logAudit(req.user!.id, AuditActions.FOLDER_CREATE, 'FOLDER', folder.id, { name, path: folderPath }, req);

      res.status(201).json({ folder });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/admin/knowledge/folders/:id
 * Update folder
 */
router.put('/folders/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, knowledgeMode, status, priority, promptOverride } = req.body;

    const existing = await prisma.folder.findUnique({ where: { id } });
    if (!existing) {
      throw NotFoundError('Folder');
    }

    const folder = await prisma.folder.update({
      where: { id },
      data: {
        name: name || undefined,
        description: description !== undefined ? description : undefined,
        knowledgeMode: knowledgeMode || undefined,
        status: status || undefined,
        priority: priority !== undefined ? priority : undefined,
        promptOverride: promptOverride !== undefined ? promptOverride : undefined,
      },
    });

    await logAudit(req.user!.id, AuditActions.FOLDER_UPDATE, 'FOLDER', id, { name }, req);

    res.json({ folder });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/knowledge/folders/:id
 * Delete folder (and all children/documents)
 */
router.delete('/folders/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const folder = await prisma.folder.findUnique({
      where: { id },
      include: { _count: { select: { children: true, documents: true } } },
    });

    if (!folder) {
      throw NotFoundError('Folder');
    }

    // Cascade delete is handled by Prisma schema
    await prisma.folder.delete({ where: { id } });

    await logAudit(req.user!.id, AuditActions.FOLDER_DELETE, 'FOLDER', id, {
      name: folder.name,
      childrenDeleted: folder._count.children,
      documentsDeleted: folder._count.documents,
    }, req);

    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// DOCUMENTS
// ============================================

/**
 * GET /api/admin/knowledge/documents
 * List all documents
 */
router.get('/documents', async (req, res, next) => {
  try {
    const { folderId, status, page = '1', limit = '50' } = req.query;

    const where: Record<string, unknown> = {};
    if (folderId) where.folderId = folderId;
    if (status) where.status = status;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          folder: { select: { id: true, name: true, path: true } },
          _count: { select: { chunks: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.document.count({ where }),
    ]);

    res.json({
      documents,
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
 * POST /api/admin/knowledge/documents/upload
 * Upload documents to a folder
 */
router.post('/documents/upload', upload.array('files', 20), async (req, res, next) => {
  try {
    const { folderId } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!folderId) {
      throw BadRequestError('folderId is required');
    }

    if (!files || files.length === 0) {
      throw BadRequestError('No files uploaded');
    }

    // Verify folder exists
    const folder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder) {
      throw NotFoundError('Folder');
    }

    // Create document records
    const documents = await Promise.all(
      files.map(async (file) => {
        const crypto = await import('crypto');
        const fs = await import('fs');
        const fileBuffer = fs.readFileSync(file.path);
        const fileHash = crypto.createHash('md5').update(fileBuffer).digest('hex');

        return prisma.document.create({
          data: {
            name: file.originalname,
            fileType: path.extname(file.originalname).slice(1),
            filePath: file.path,
            fileSize: file.size,
            fileHash,
            folderId,
            status: 'PENDING',
          },
        });
      })
    );

    await logAudit(req.user!.id, AuditActions.DOCUMENT_UPLOAD, 'DOCUMENT', undefined, {
      folderId,
      count: documents.length,
      files: documents.map(d => d.name),
    }, req);

    // TODO: Trigger async processing (ingest pipeline)

    res.status(201).json({
      message: `${documents.length} document(s) uploaded successfully`,
      documents,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/knowledge/documents/:id
 * Delete document
 */
router.delete('/documents/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      throw NotFoundError('Document');
    }

    // Delete file from disk
    try {
      const fs = await import('fs');
      if (fs.existsSync(document.filePath)) {
        fs.unlinkSync(document.filePath);
      }
    } catch (e) {
      // Ignore file deletion errors
    }

    // Delete from database (cascades to chunks)
    await prisma.document.delete({ where: { id } });

    // TODO: Remove vectors from Qdrant

    await logAudit(req.user!.id, AuditActions.DOCUMENT_DELETE, 'DOCUMENT', id, { name: document.name }, req);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/knowledge/documents/:id/reindex
 * Reprocess/reindex a document
 */
router.post('/documents/:id/reindex', async (req, res, next) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      throw NotFoundError('Document');
    }

    // Import and use ingest service
    const { ingestService } = await import('../../services/ingest/ingestService.js');
    const result = await ingestService.reindexDocument(id);

    await logAudit(req.user!.id, AuditActions.DOCUMENT_REINDEX, 'DOCUMENT', id, { name: document.name }, req);

    res.json({ 
      message: result.status === 'success' ? 'Document reindexed successfully' : 'Reindexing failed',
      result 
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/knowledge/documents/:id/process
 * Process a pending document (create chunks and index)
 */
router.post('/documents/:id/process', async (req, res, next) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      throw NotFoundError('Document');
    }

    // Import and use ingest service
    const { ingestService } = await import('../../services/ingest/ingestService.js');
    const result = await ingestService.processDocument(id);

    await logAudit(req.user!.id, AuditActions.DOCUMENT_REINDEX, 'DOCUMENT', id, { 
      name: document.name,
      chunksCreated: result.chunksCreated 
    }, req);

    res.json({ 
      message: result.status === 'success' ? 'Document processed successfully' : 'Processing failed',
      result 
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/knowledge/documents/process-all
 * Process all pending documents
 */
router.post('/documents/process-all', async (req, res, next) => {
  try {
    const { ingestService } = await import('../../services/ingest/ingestService.js');
    const results = await ingestService.processAllPending();

    res.json({ 
      message: `Processed ${results.length} documents`,
      results 
    });
  } catch (error) {
    next(error);
  }
});

export default router;

