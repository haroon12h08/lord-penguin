import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { CreateProjectBriefSchema, RescheduleTaskSchema } from '@lord-penguin/shared';
import { projectPlannerService } from '../services/project-planner.service.js';
import { lrmEngineService } from '../services/lrm-engine.service.js';

export const projectsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // 1. List Projects
  app.get('/api/v1/projects', async (request, reply) => {
    const list = await projectPlannerService.listProjects();
    return reply.send({ projects: list });
  });

  // 2. Get Project Aggregate
  app.get<{ Params: { projectId: string } }>(
    '/api/v1/projects/:projectId',
    async (request, reply) => {
      const { projectId } = request.params;
      const aggregate = await projectPlannerService.getProjectAggregate(projectId);
      return reply.send(aggregate);
    }
  );

  // 3. Create Project from Natural Language Brief
  app.post('/api/v1/projects/from-brief', async (request, reply) => {
    const parsed = CreateProjectBriefSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: 'INVALID_REQUEST_BODY', details: parsed.error.format() }
      });
    }

    const created = await projectPlannerService.createProjectFromBrief(parsed.data);
    return reply.status(201).send(created);
  });

  // 4. Reschedule Task (Bryntum Gantt Drag / Drop / Resize)
  app.patch<{ Params: { projectId: string; taskId: string } }>(
    '/api/v1/projects/:projectId/tasks/:taskId',
    async (request, reply) => {
      const { projectId, taskId } = request.params;
      const parsed = RescheduleTaskSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'INVALID_TASK_DATES', details: parsed.error.format() }
        });
      }

      const result = await lrmEngineService.rescheduleTask(
        projectId,
        taskId,
        parsed.data.startDate,
        parsed.data.endDate
      );

      return reply.send(result);
    }
  );
};
