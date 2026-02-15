import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/support/tickets â€” list user's tickets
// ---------------------------------------------------------------------------

router.get('/tickets', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const status = (req.query.status || '') as string;

    const where: any = { userId };
    if (status && ['OPEN', 'IN_PROGRESS', 'WAITING_ON_USER', 'RESOLVED', 'CLOSED'].includes(status)) {
      where.status = status;
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: { select: { messages: true } },
      },
    });

    res.json({
      tickets: tickets.map((t) => ({
        id: t.id,
        subject: t.subject,
        category: t.category,
        priority: t.priority,
        status: t.status,
        messageCount: t._count.messages,
        lastMessage: t.messages[0]
          ? {
              content: t.messages[0].content.slice(0, 120),
              isStaff: t.messages[0].isStaff,
              createdAt: t.messages[0].createdAt,
            }
          : null,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/support/tickets â€” create new ticket
// ---------------------------------------------------------------------------

router.post('/tickets', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { subject, category, priority, message } = req.body;

    if (!subject || typeof subject !== 'string' || subject.length < 3 || subject.length > 200) {
      return res.status(400).json({ error: 'Subject required (3-200 chars)' });
    }
    if (!message || typeof message !== 'string' || message.length < 10 || message.length > 5000) {
      return res.status(400).json({ error: 'Message required (10-5000 chars)' });
    }

    const validCategories = ['general', 'billing', 'technical', 'feature', 'bug'];
    const validPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        subject: subject.trim(),
        category: validCategories.includes(category) ? category : 'general',
        priority: validPriorities.includes(priority) ? priority : 'NORMAL',
        messages: {
          create: {
            content: message.trim(),
            isStaff: false,
          },
        },
      },
      include: {
        messages: true,
      },
    });

    res.status(201).json({ ticket });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/support/tickets/:id â€” get ticket with messages
// ---------------------------------------------------------------------------

router.get('/tickets/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const ticketId = req.params.id as string;

    const ticket = await prisma.supportTicket.findFirst({
      where: { id: ticketId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    res.json({ ticket });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/support/tickets/:id/messages â€” reply to ticket
// ---------------------------------------------------------------------------

router.post('/tickets/:id/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const ticketId = req.params.id as string;
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.length < 1 || message.length > 5000) {
      return res.status(400).json({ error: 'Message required (1-5000 chars)' });
    }

    const ticket = await prisma.supportTicket.findFirst({
      where: { id: ticketId, userId },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    if (['CLOSED', 'RESOLVED'].includes(ticket.status)) {
      return res.status(400).json({ error: 'Cannot reply to a closed ticket' });
    }

    const [newMessage] = await prisma.$transaction([
      prisma.ticketMessage.create({
        data: {
          ticketId,
          content: message.trim(),
          isStaff: false,
        },
      }),
      prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: ticket.status === 'WAITING_ON_USER' ? 'OPEN' : ticket.status,
          updatedAt: new Date(),
        },
      }),
    ]);

    res.status(201).json({ message: newMessage });
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/support/tickets/:id/close â€” close a ticket
// ---------------------------------------------------------------------------

router.patch('/tickets/:id/close', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const ticketId = req.params.id as string;

    const ticket = await prisma.supportTicket.findFirst({
      where: { id: ticketId, userId },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'CLOSED', closedAt: new Date() },
    });

    res.json({ ticket: updated });
  } catch (error) {
    console.error('Error closing ticket:', error);
    res.status(500).json({ error: 'Failed to close ticket' });
  }
});

export default router;
