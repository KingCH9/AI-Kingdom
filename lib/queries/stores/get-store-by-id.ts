import { notFound } from "next/navigation";
import { normalizeOpportunityStatus } from "@/lib/opportunity/status";
import { parseMarketingPlanFromTaskResult } from "@/lib/store/parse-marketing-plan";
import { normalizeStoreStatus } from "@/lib/store/status";
import { TASK_STATUSES, TASK_TITLE_PREFIX } from "@/lib/tasks/constants";
import type { TaskStatus } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { AGENT_ROLE_LABELS, resolveAgentLogRole } from "./agent-log-role";
import type { StoreDetailViewModel, StoreTaskEntry, StoreTasksByStatus, StoreCommerceMetrics, StoreOrderEntry } from "./types";

function emptyTasksByStatus(): StoreTasksByStatus {
  return {
    pending: [],
    in_progress: [],
    completed: [],
    failed: [],
  };
}

function toTaskEntry(task: {
  id: number;
  title: string;
  agent: string;
  status: string;
  result: string | null;
  createdAt: Date;
  completedAt: Date | null;
}): StoreTaskEntry {
  return {
    id: task.id,
    title: task.title,
    agent: task.agent,
    status: task.status as TaskStatus,
    result: task.result,
    createdAt: task.createdAt,
    completedAt: task.completedAt,
  };
}

function groupTasksByStatus(
  tasks: Array<{
    id: number;
    title: string;
    agent: string;
    status: string;
    result: string | null;
    createdAt: Date;
    completedAt: Date | null;
  }>
): StoreTasksByStatus {
  const grouped = emptyTasksByStatus();

  for (const task of tasks) {
    const entry = toTaskEntry(task);

    switch (task.status) {
      case TASK_STATUSES.PENDING:
        grouped.pending.push(entry);
        break;
      case TASK_STATUSES.IN_PROGRESS:
        grouped.in_progress.push(entry);
        break;
      case TASK_STATUSES.COMPLETED:
        grouped.completed.push(entry);
        break;
      case TASK_STATUSES.FAILED:
        grouped.failed.push(entry);
        break;
      default:
        grouped.pending.push(entry);
    }
  }

  return grouped;
}

async function getStoreCommerceMetrics(storeId: number): Promise<StoreCommerceMetrics> {
  const [customerCount, orderAgg] = await Promise.all([
    prisma.customer.count({ where: { storeId } }),
    prisma.order.aggregate({
      where: { storeId },
      _count: { id: true },
      _sum: { total: true },
    }),
  ]);

  const totalOrders = orderAgg._count.id;
  const orderTotal = orderAgg._sum.total ?? 0;

  return {
    totalCustomers: customerCount,
    totalOrders,
    averageOrderValue:
      totalOrders > 0 ? Math.round((orderTotal / totalOrders) * 100) / 100 : 0,
  };
}

async function getStoreOrders(storeId: number): Promise<StoreOrderEntry[]> {
  const orders = await prisma.order.findMany({
    where: { storeId },
    include: {
      customer: {
        select: { email: true, name: true },
      },
    },
    orderBy: { placedAt: "desc" },
    take: 50,
  });

  return orders.map((order) => ({
    id: order.id,
    placedAt: order.placedAt,
    customerEmail: order.customer.email,
    customerName: order.customer.name,
    source: order.source,
    total: order.total,
    status: order.status,
  }));
}

async function getStoreAgentLogs(
  storeId: number,
  opportunityId: number | null,
  productName: string | null
) {
  const legacyOr: Array<{ action: { contains: string } }> = [
    { action: { contains: `store #${storeId}` } },
  ];

  if (opportunityId) {
    legacyOr.push({ action: { contains: `#${opportunityId}` } });
  }

  if (productName) {
    legacyOr.push({ action: { contains: productName } });
  }

  return prisma.agentLog.findMany({
    where: {
      OR: [
        { storeId },
        ...(opportunityId ? [{ opportunityId }] : []),
        {
          AND: [
            { storeId: null },
            { opportunityId: null },
            { OR: legacyOr },
          ],
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getStoreById(id: number): Promise<StoreDetailViewModel | null> {
  const store = await prisma.store.findUnique({
    where: { id },
    include: {
      opportunity: true,
      products: {
        select: { id: true, name: true, price: true },
        orderBy: { id: "asc" },
      },
      revenues: { select: { id: true } },
    },
  });

  if (!store) {
    return null;
  }

  const opportunityId = store.opportunityId;
  const tasks = opportunityId
    ? await prisma.task.findMany({
        where: { opportunityId },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const marketingTask = tasks.find(
    (task) =>
      task.title.startsWith(TASK_TITLE_PREFIX.MARKETING_PLAN) &&
      task.status === TASK_STATUSES.COMPLETED &&
      task.result
  );

  const agentLogs = await getStoreAgentLogs(
    store.id,
    opportunityId,
    store.opportunity?.productName ?? store.name
  );

  const [commerce, orders] = await Promise.all([
    getStoreCommerceMetrics(store.id),
    getStoreOrders(store.id),
  ]);

  return {
    id: store.id,
    name: store.name,
    niche: store.niche,
    revenue: store.revenue,
    status: normalizeStoreStatus(store.status),
    rawStatus: store.status,
    createdAt: store.createdAt,
    productCount: store.products.length,
    products: store.products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
    })),
    revenueEntryCount: store.revenues.length,
    commerce,
    orders,
    opportunity: store.opportunity
      ? {
          id: store.opportunity.id,
          productName: store.opportunity.productName,
          productDescription: store.opportunity.productDescription,
          targetCustomer: store.opportunity.targetCustomer,
          profitMargin: store.opportunity.profitMargin,
          supplier: store.opportunity.supplier,
          whyTrending: store.opportunity.whyTrending,
          opportunityScore: store.opportunity.opportunityScore,
          lifecycleStage: normalizeOpportunityStatus(store.opportunity.status),
        }
      : null,
    marketingPlan: parseMarketingPlanFromTaskResult(marketingTask?.result),
    agentLogs: agentLogs.map((log) => ({
      id: log.id,
      agentName: log.agentName,
      action: log.action,
      createdAt: log.createdAt,
      agentRole: resolveAgentLogRole(log.agentName),
    })),
    tasks: groupTasksByStatus(tasks),
  };
}

export async function requireStoreById(id: number): Promise<StoreDetailViewModel> {
  const store = await getStoreById(id);

  if (!store) {
    notFound();
  }

  return store;
}

export { AGENT_ROLE_LABELS };
