import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';

@Injectable()
export class RequestRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * Get requests for RM - PENDING steps assigned to RM
   */
  async getRequestsForRM(
    tenantId: string,
    rmUserId: string,
    options: {
      limit: number;
      page: number;
      module?: string;
      status?: string;
    },
  ) {
    const skip = (options.page - 1) * options.limit;

    const instances = await this.prisma.requestApprovalInstance.findMany({
      where: {
        tenantId,
        status: 'IN_PROGRESS',
        stepInstances: {
          some: {
            status: 'PENDING',
            approverId: rmUserId,
          },
        },
        ...(options.module && { module: options.module as any }),
      },
      include: {
        workflow: { select: { id: true, name: true, module: true } },
        stepInstances: {
          orderBy: { stepNumber: 'asc' },
          include: {
            step: { include: { approverRole: { select: { id: true, name: true } } } },
            approver: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
      skip,
      take: options.limit,
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.requestApprovalInstance.count({
      where: {
        tenantId,
        status: 'IN_PROGRESS',
        stepInstances: {
          some: {
            status: 'PENDING',
            approverId: rmUserId,
          },
        },
        ...(options.module && { module: options.module as any }),
      },
    });

    const requests = await Promise.all(
      instances.map((inst) => this.getRequestDetailsForStepInstance(inst.module, inst.requestId)),
    );

    return {
      data: requests
        .filter((req) => req !== null)
        .map((req: any, idx: number) => ({
          ...req,
          approvalInstance: instances[idx],
        })),
      meta: {
        totalRecords: total,
        totalPages: Math.ceil(total / options.limit),
        page: options.page,
        limit: options.limit,
      },
    };
  }

  /**
   * Get requests for HR - PENDING steps assigned to HR role
   */
  async getRequestsForHR(
    tenantId: string,
    hrUserId: string,
    options: {
      limit: number;
      page: number;
      module?: string;
      status?: string;
    },
  ) {
    const hrUser = await this.prisma.user.findUnique({
      where: { id: hrUserId },
      select: { roleId: true },
    });

    if (!hrUser?.roleId) {
      return {
        data: [],
        meta: {
          totalRecords: 0,
          totalPages: 0,
          page: options.page,
          limit: options.limit,
        },
      };
    }

    const skip = (options.page - 1) * options.limit;

    const instances = await this.prisma.requestApprovalInstance.findMany({
      where: {
        tenantId,
        status: 'IN_PROGRESS',
        stepInstances: {
          some: {
            status: 'PENDING',
            step: {
              approverType: 'ROLE',
              approverRoleId: hrUser.roleId,
            },
          },
        },
        ...(options.module && { module: options.module as any }),
      },
      include: {
        workflow: { select: { id: true, name: true, module: true } },
        stepInstances: {
          orderBy: { stepNumber: 'asc' },
          include: {
            step: { include: { approverRole: { select: { id: true, name: true } } } },
            approver: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
      skip,
      take: options.limit,
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.requestApprovalInstance.count({
      where: {
        tenantId,
        status: 'IN_PROGRESS',
        stepInstances: {
          some: {
            status: 'PENDING',
            step: {
              approverType: 'ROLE',
              approverRoleId: hrUser.roleId,
            },
          },
        },
        ...(options.module && { module: options.module as any }),
      },
    });

    const requests = await Promise.all(
      instances.map((inst) => this.getRequestDetailsForStepInstance(inst.module, inst.requestId)),
    );

    return {
      data: requests
        .filter((req) => req !== null)
        .map((req: any, idx: number) => ({
          ...req,
          approvalInstance: instances[idx],
        })),
      meta: {
        totalRecords: total,
        totalPages: Math.ceil(total / options.limit),
        page: options.page,
        limit: options.limit,
      },
    };
  }

  /**
   * Get all requests - ADMIN view
   */
  async getAllRequests(
    tenantId: string,
    options: {
      limit: number;
      page: number;
      module?: string;
      status?: string;
    },
  ) {
    const skip = (options.page - 1) * options.limit;

    const whereClause: any = {
      tenantId,
      ...(options.module && { module: options.module as any }),
      ...(options.status && {
        stepInstances: {
          some: {
            status: options.status as any,
          },
        },
      }),
    };

    const instances = await this.prisma.requestApprovalInstance.findMany({
      where: whereClause,
      include: {
        workflow: { select: { id: true, name: true, module: true } },
        stepInstances: {
          orderBy: { stepNumber: 'asc' },
          include: {
            step: { include: { approverRole: { select: { id: true, name: true } } } },
            approver: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
      skip,
      take: options.limit,
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.requestApprovalInstance.count({
      where: whereClause,
    });

    const requests = await Promise.all(
      instances.map((inst) => this.getRequestDetailsForStepInstance(inst.module, inst.requestId)),
    );

    return {
      data: requests
        .filter((req) => req !== null)
        .map((req: any, idx: number) => ({
          ...req,
          approvalInstance: instances[idx],
        })),
      meta: {
        totalRecords: total,
        totalPages: Math.ceil(total / options.limit),
        page: options.page,
        limit: options.limit,
      },
    };
  }

  /**
   * Get requests for EMPLOYEE
   */
  async getRequestsForEmployee(
    tenantId: string,
    userId: string,
    options: {
      limit: number;
      page: number;
      module?: string;
      status?: string;
    },
  ) {
    const skip = (options.page - 1) * options.limit;

    const instances = await this.prisma.requestApprovalInstance.findMany({
      where: {
        tenantId,
        regularization: {
          is: {
            userId,
          },
        },
        ...(options.module && { module: options.module as any }),
      },
      include: {
        workflow: { select: { id: true, name: true, module: true } },
        stepInstances: {
          orderBy: { stepNumber: 'asc' },
          include: {
            step: { include: { approverRole: { select: { id: true, name: true } } } },
            approver: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
      skip,
      take: options.limit,
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.requestApprovalInstance.count({
      where: {
        tenantId,
        regularization: {
          is: {
            userId,
          },
        },
        ...(options.module && { module: options.module as any }),
      },
    });

    const requests = await Promise.all(
      instances.map((inst) => this.getRequestDetailsForStepInstance(inst.module, inst.requestId)),
    );

    return {
      data: requests
        .filter((req) => req !== null)
        .map((req: any, idx: number) => ({
          ...req,
          approvalInstance: instances[idx],
        })),
      meta: {
        totalRecords: total,
        totalPages: Math.ceil(total / options.limit),
        page: options.page,
        limit: options.limit,
      },
    };
  }

  /**
   * Find request by ID
   */
  async findRequestById(requestId: string) {
    const regularization = await this.prisma.attendanceRegularization.findUnique({
      where: { id: requestId },
      include: {
        approvalInstance: {
          include: {
            workflow: { select: { id: true, name: true, module: true } },
            stepInstances: {
              orderBy: { stepNumber: 'asc' },
              include: {
                step: { include: { approverRole: { select: { id: true, name: true } } } },
                approver: { select: { id: true, firstName: true, lastName: true, email: true } },
              },
            },
          },
        },
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (regularization) {
      return {
        ...regularization,
        module: 'REGULARIZATION',
      };
    }

    return null;
  }

  /**
   * Helper: Get request details based on module
   */
  private async getRequestDetailsForStepInstance(module: string, requestId: string) {
    if (module === 'REGULARIZATION') {
      return this.prisma.attendanceRegularization.findUnique({
        where: { id: requestId },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });
    }

    return null;
  }

  /**
   * Update request status
   */
  async updateRequestStatus(requestId: string, status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED') {
    return this.prisma.attendanceRegularization.update({
      where: { id: requestId },
      data: { status: status as any },
    });
  }
}
