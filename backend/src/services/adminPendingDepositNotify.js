import { prisma } from '../db.js';
import { config } from '../config/index.js';
import { getNetwork } from '../config/networks.js';
import {
  broadcastDmMessage,
  notifyConversationParticipants,
  notifyUser,
} from './communityRealtime.js';
import { getUnreadSummary } from './communityUnread.js';
import { resolveAvatarUrl } from './avatar.js';

const MAX_CONTENT = 2000;

function orderedPair(userIdA, userIdB) {
  return userIdA < userIdB
    ? { participantA: userIdA, participantB: userIdB }
    : { participantA: userIdB, participantB: userIdA };
}

function displayName(user) {
  if (user.username) return `@${user.username}`;
  return user.name || user.email || user.phone || 'User';
}

function formatPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    phone: user.phone,
    displayName: displayName(user),
    role: user.role,
    avatarUrl: resolveAvatarUrl(user),
    createdAt: user.createdAt,
  };
}

const userPublicSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  avatarUrl: true,
  createdAt: true,
};

function paymentLine(payment) {
  const networkName = getNetwork(payment.chainId)?.name || `Chain ${payment.chainId}`;
  const usd =
    payment.usdAmount && parseFloat(payment.usdAmount) > 0
      ? ` (~$${parseFloat(payment.usdAmount).toFixed(2)} USD)`
      : '';
  const link = `${config.frontendUrl.replace(/\/$/, '')}/pay/${payment.id}`;
  return `• ${payment.amount} ${payment.tokenSymbol}${usd} — ${networkName}\n  Open: ${link}`;
}

function buildMessage(payments, draftText) {
  const intro =
    String(draftText || '').trim() ||
    (payments.length === 1
      ? 'Hi! Friendly reminder — you still have a pending deposit on StackPay.\n\nPlease complete your payment soon so we can credit your USD balance. Reply here if you need help.'
      : `Hi! Friendly reminder — you still have ${payments.length} pending deposits on StackPay.\n\nPlease complete your payment soon so we can credit your USD balance. Reply here if you need help.`);
  const lines = payments.map(paymentLine).join('\n');
  return `${intro}\n\nYour pending deposit(s):\n${lines}`;
}

async function sendAdminDm(adminId, peerId, content) {
  const text = String(content || '').trim();
  if (!text) throw Object.assign(new Error('Message is required'), { status: 400 });
  if (text.length > MAX_CONTENT) {
    throw Object.assign(new Error(`Message must be under ${MAX_CONTENT} characters`), {
      status: 400,
    });
  }
  if (peerId === adminId) {
    throw Object.assign(new Error('Cannot message yourself'), { status: 400 });
  }

  const peer = await prisma.user.findUnique({
    where: { id: peerId },
    select: { id: true },
  });
  if (!peer) throw Object.assign(new Error('User not found'), { status: 404 });

  const pair = orderedPair(adminId, peerId);
  const conversation = await prisma.conversation.upsert({
    where: { participantA_participantB: pair },
    create: pair,
    update: {},
  });

  const message = await prisma.$transaction(async (tx) => {
    const msg = await tx.directMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: adminId,
        content: text,
      },
      include: { sender: { select: userPublicSelect } },
    });
    await tx.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });
    return msg;
  });

  broadcastDmMessage(conversation.id, {
    id: message.id,
    content: message.content,
    createdAt: message.createdAt,
    senderId: message.senderId,
    sender: formatPublicUser(message.sender),
    quotedPostId: message.quotedPostId,
    quotedContent: message.quotedContent,
  });
  notifyConversationParticipants(conversation, {
    type: 'conversations:update',
    conversationId: conversation.id,
  });
  const peerSummary = await getUnreadSummary(peerId);
  notifyUser(peerId, { type: 'unread:update', summary: peerSummary });

  return {
    conversationId: conversation.id,
    messageId: message.id,
    userId: peerId,
  };
}

/**
 * Notify users who have PENDING deposits via admin DM.
 * @param {string} adminId
 * @param {{ message?: string, paymentIds?: string[] }} options
 */
export async function notifyPendingDepositors(adminId, options = {}) {
  const where = {
    status: 'PENDING',
    userId: { not: null },
  };
  if (Array.isArray(options.paymentIds) && options.paymentIds.length > 0) {
    where.id = { in: options.paymentIds };
  }

  const payments = await prisma.payment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      userId: true,
      amount: true,
      tokenSymbol: true,
      chainId: true,
      usdAmount: true,
      createdAt: true,
    },
  });

  const byUser = new Map();
  for (const p of payments) {
    if (!p.userId || p.userId === adminId) continue;
    if (!byUser.has(p.userId)) byUser.set(p.userId, []);
    byUser.get(p.userId).push(p);
  }

  const customMessage = String(options.message || '').trim();
  const results = [];

  for (const [userId, userPayments] of byUser) {
    try {
      const content = buildMessage(userPayments, customMessage);
      const sent = await sendAdminDm(adminId, userId, content);
      results.push({
        success: true,
        userId,
        paymentCount: userPayments.length,
        paymentIds: userPayments.map((p) => p.id),
        ...sent,
      });
    } catch (err) {
      results.push({
        success: false,
        userId,
        paymentCount: userPayments.length,
        paymentIds: userPayments.map((p) => p.id),
        error: err.message || 'Failed to send',
      });
    }
  }

  return {
    pendingPayments: payments.length,
    uniqueUsers: byUser.size,
    sent: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
}

export async function notifyPendingDepositByPaymentId(adminId, paymentId, message) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      userId: true,
      status: true,
      amount: true,
      tokenSymbol: true,
      chainId: true,
      usdAmount: true,
      createdAt: true,
    },
  });

  if (!payment) throw Object.assign(new Error('Payment not found'), { status: 404 });
  if (payment.status !== 'PENDING') {
    throw Object.assign(new Error('Payment is not pending'), { status: 400 });
  }
  if (!payment.userId) {
    throw Object.assign(new Error('Payment has no linked user'), { status: 400 });
  }

  return notifyPendingDepositors(adminId, {
    paymentIds: [payment.id],
    message: message || undefined,
  });
}
