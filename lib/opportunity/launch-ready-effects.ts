import type { Opportunity } from "@prisma/client";

import {

  AGENT_NAMES,

  AGENT_ROLES,

  findAgentByRole,

} from "@/lib/agents";

import { TASK_STATUSES, TASK_TITLE_PREFIX } from "@/lib/tasks/constants";

import { prisma } from "@/lib/prisma";
import { ensureStoreForOpportunity } from "@/lib/store/link-opportunity";



/** Creates launch-ready tasks for Store Builder and Marketing Manager. */

export async function createLaunchReadyTasks(opportunity: Opportunity) {

  const storeBuilder = await findAgentByRole(AGENT_ROLES.STORE_BUILDER);

  const marketingManager = await findAgentByRole(

    AGENT_ROLES.MARKETING_MANAGER

  );



  const taskDefinitions = [

    {

      title: `${TASK_TITLE_PREFIX.BUILD_STORE}${opportunity.productName}`,

      agent: storeBuilder?.name ?? AGENT_NAMES.STORE_BUILDER,

    },

    {

      title: `${TASK_TITLE_PREFIX.MARKETING_PLAN}${opportunity.productName}`,

      agent: marketingManager?.name ?? AGENT_NAMES.MARKETING_MANAGER,

    },

  ];



  for (const task of taskDefinitions) {

    const existing = await prisma.task.findFirst({

      where: {

        title: task.title,

        status: { in: [TASK_STATUSES.PENDING, TASK_STATUSES.IN_PROGRESS] },

      },

    });



    if (!existing) {

      await prisma.task.create({

        data: {

          title: task.title,

          agent: task.agent,

          status: TASK_STATUSES.PENDING,

          result: "",

          opportunityId: opportunity.id,

        },

      });

    }

  }

}



export { ensureStoreForOpportunity };



/** Side effects when an opportunity reaches launch_ready — tasks only; store built by Forge on task execution. */

export async function handleLaunchReadyEffects(opportunity: Opportunity) {

  await createLaunchReadyTasks(opportunity);

}


