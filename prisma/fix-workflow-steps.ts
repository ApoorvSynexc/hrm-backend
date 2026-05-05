import 'dotenv/config';
import pg from 'pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

async function main() {
  const systemWorkflows = await (prisma as any).approvalWorkflow.findMany({
    where: { isSystem: true, status: 'ACTIVE' },
    include: { steps: { orderBy: { stepNumber: 'asc' } } },
  });

  console.log(`Found ${systemWorkflows.length} system workflow(s)`);

  for (const wf of systemWorkflows) {
    const stepsToRemove = wf.steps.filter((s: any) => s.stepNumber > 1);
    if (stepsToRemove.length === 0) {
      console.log(`  ✓ "${wf.name}" (${wf.module}) — already 1 step, skipping`);
      continue;
    }

    for (const step of stepsToRemove) {
      // Mark any PENDING/NOT_STARTED step instances as SKIPPED so existing
      // requests can complete, then delete the step instances and the step.
      const instances = await (prisma as any).requestApprovalStepInstance.findMany({
        where: { stepId: step.id },
      });

      for (const inst of instances) {
        if (inst.status === 'PENDING' || inst.status === 'NOT_STARTED') {
          await (prisma as any).requestApprovalStepInstance.update({
            where: { id: inst.id },
            data: {
              status: 'SKIPPED',
              comment: 'Step removed from workflow',
              reviewedAt: new Date(),
            },
          });
          console.log(`    → Skipped step instance ${inst.id} (was ${inst.status})`);

          // If this was the blocking step (PENDING), finalize the parent instance as APPROVED
          if (inst.status === 'PENDING') {
            const allInstances = await (prisma as any).requestApprovalStepInstance.findMany({
              where: { instanceId: inst.instanceId },
            });
            const allDone = allInstances.every(
              (i: any) => i.status === 'APPROVED' || i.status === 'SKIPPED' || i.id === inst.id,
            );
            if (allDone) {
              await (prisma as any).requestApprovalInstance.update({
                where: { id: inst.instanceId },
                data: { status: 'APPROVED' },
              });
              // Also approve the parent regularization request
              const regularization = await (prisma as any).attendanceRegularization.findFirst({
                where: { approvalInstanceId: inst.instanceId },
                select: { id: true },
              });
              if (regularization) {
                await (prisma as any).attendanceRegularization.update({
                  where: { id: regularization.id },
                  data: { status: 'APPROVED' },
                });
                console.log(`    → Approved regularization ${regularization.id}`);
              }
            }
          }
        }
      }

      // Now delete all step instances (they are either SKIPPED, APPROVED, or REJECTED)
      await (prisma as any).requestApprovalStepInstance.deleteMany({ where: { stepId: step.id } });
      await (prisma as any).approvalStep.delete({ where: { id: step.id } });
      console.log(`  ✗ Removed step ${step.stepNumber} ("${step.name}") from "${wf.name}" (${wf.module})`);
    }

    await (prisma as any).approvalWorkflow.update({
      where: { id: wf.id },
      data: { description: "Employee's reporting manager approves" },
    });

    console.log(`  ✓ "${wf.name}" (${wf.module}) fixed — now 1 step only`);
  }

  console.log('\n✅ Done.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error('❌ Error:', err);
    await prisma.$disconnect();
    process.exit(1);
  });
