import { Db, ObjectId } from "mongodb";
import { database } from "../database/Database";
import { AuthService } from "../service/AuthService";
import { Role } from "../model/Entity";
import { Constant } from "../util/Constant";
import { Action, Resource } from "../util/Enum";
import { NotFoundError } from "elysia";
import { ForbiddenError } from "../util/Error";

interface RoleQuery {
  query?: string;
  resource?: Resource;
  action?: Action;
  sensitivityLevel?: "low" | "medium" | "high" | "critical";
  hasPermission?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export class RoleRepository {
  private database: Db;
  private authService: AuthService;

  constructor(private userId: string) {
    this.database = database;
    this.authService = new AuthService(this.database, this.userId);
  }

  private calculateSensitivityLevel(role: Role): string {
    const criticalResources = [
      Resource.USER,
      Resource.ROLE,
      Resource.PERMISSION,
    ];
    const criticalActions = [Action.DELETE, Action.UPDATE];

    let hasSystemAccess = false;
    let hasCriticalActions = false;
    let permissionCount = 0;

    for (const permission of role.permissions) {
      permissionCount++;

      if (criticalResources.includes(permission.resource)) {
        hasSystemAccess = true;
      }

      if (
        permission.actions.some((action) => criticalActions.includes(action))
      ) {
        hasCriticalActions = true;
      }
    }

    if (hasSystemAccess && hasCriticalActions) {
      return "critical";
    } else if (hasSystemAccess || hasCriticalActions) {
      return "high";
    } else if (permissionCount > 5) {
      return "medium";
    }
    return "low";
  }

  async getAllRoles(
    query?: RoleQuery
  ): Promise<{ roles: Role[]; total: number }> {
    if (!(await this.authService.hasPermission(Resource.ROLE, Action.READ))) {
      throw new ForbiddenError("You don't have permission to read roles");
    }

    const filter: any = {};

    // Text search
    if (query?.query) {
      filter.$or = [
        { name: { $regex: query.query, $options: "i" } },
        { description: { $regex: query.query, $options: "i" } },
      ];
    }

    // Permission filters
    if (query?.resource || query?.action) {
      filter.permissions = { $elemMatch: {} };
      if (query.resource) {
        filter.permissions.$elemMatch.resource = query.resource;
      }
      if (query.action) {
        filter.permissions.$elemMatch.actions = query.action;
      }
    }

    // Has any permissions filter
    if (query?.hasPermission !== undefined) {
      if (query.hasPermission) {
        filter["permissions.0"] = { $exists: true };
      } else {
        filter.$or = [
          { permissions: { $exists: false } },
          { permissions: { $size: 0 } },
        ];
      }
    }

    // Sensitivity level filter
    if (query?.sensitivityLevel) {
      filter.sensitivityLevel = query.sensitivityLevel;
    }

    const sort: any = {};
    if (query?.sortBy === "sensitivityLevel") {
      // Custom sort order for sensitivityLevel
      const sensitivityOrder = {
        critical: 4,
        high: 3,
        medium: 2,
        low: 1,
      };
      sort.sensitivityLevel = query.sortOrder === "desc" ? -1 : 1;
    } else if (query?.sortBy) {
      sort[query.sortBy] = query.sortOrder === "desc" ? -1 : 1;
    }

    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    let roles = await this.database
      .collection<Role>(Constant.ROLE_COLLECTION)
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();

    if (query?.sortBy === "sensitivityLevel") {
      roles.sort((a, b) => {
        const sensitivityOrder = {
          critical: 4,
          high: 3,
          medium: 2,
          low: 1,
        };
        const orderA =
          sensitivityOrder[a.sensitivityLevel as keyof typeof sensitivityOrder];
        const orderB =
          sensitivityOrder[b.sensitivityLevel as keyof typeof sensitivityOrder];
        return query.sortOrder === "desc" ? orderB - orderA : orderA - orderB;
      });
    }

    const total = await this.database
      .collection<Role>(Constant.ROLE_COLLECTION)
      .countDocuments(filter);

    return { roles, total };
  }

  async getRoleById(roleId: string): Promise<Role> {
    if (!(await this.authService.hasPermission(Resource.ROLE, Action.READ))) {
      throw new ForbiddenError("You don't have permission to read roles");
    }

    const role = await this.database
      .collection<Role>(Constant.ROLE_COLLECTION)
      .findOne({ _id: new ObjectId(roleId) });

    if (!role) {
      throw new NotFoundError("Role not found");
    }

    return role;
  }

  async createRole(role: Partial<Role>) {
    if (!(await this.authService.hasPermission(Resource.ROLE, Action.CREATE))) {
      throw new ForbiddenError("You don't have permission to create roles");
    }

    const newRole: Role = {
      ...role,
      sensitivityLevel: this.calculateSensitivityLevel(role as Role),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Role;

    const result = await this.database
      .collection<Role>(Constant.ROLE_COLLECTION)
      .insertOne(newRole);

    return { ...newRole, _id: result.insertedId };
  }

  async updateRole(roleId: string, updateData: Partial<Role>): Promise<Role> {
    if (!(await this.authService.hasPermission(Resource.ROLE, Action.UPDATE))) {
      throw new ForbiddenError("You don't have permission to update roles");
    }

    // Recalculate sensitivity level if permissions are updated
    if (updateData.permissions) {
      updateData.sensitivityLevel = this.calculateSensitivityLevel({
        ...(await this.getRoleById(roleId)),
        ...updateData,
      } as Role);
    }

    const result = await this.database
      .collection<Role>(Constant.ROLE_COLLECTION)
      .findOneAndUpdate(
        { _id: new ObjectId(roleId) },
        {
          $set: {
            ...updateData,
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after" }
      );

    if (!result) {
      throw new NotFoundError("Role not found");
    }

    return result;
  }

  async deleteRole(roleId: string): Promise<void> {
    if (!(await this.authService.hasPermission(Resource.ROLE, Action.DELETE))) {
      throw new ForbiddenError("You don't have permission to delete roles");
    }

    const result = await this.database
      .collection<Role>(Constant.ROLE_COLLECTION)
      .deleteOne({ _id: new ObjectId(roleId) });

    if (result.deletedCount === 0) {
      throw new NotFoundError("Role not found");
    }
  }
}
