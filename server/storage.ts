import {
  users,
  sectors,
  activities,
  subtasks,
  timeAdjustmentLogs,
  activitySessions,
  activityLogs,
  projects,
  projectMembers,
  projectTemplates,
  templateActivities,
  type User,
  type UpsertUser,
  type Sector,
  type InsertSector,
  type Activity,
  type InsertActivity,
  type ActivityWithDetails,
  type UserWithSector,
  type Subtask,
  type InsertSubtask,
  type TimeAdjustmentLog,
  type InsertTimeAdjustmentLog,
  type ActivitySession,
  type InsertActivitySession,
  type ActivityLog,
  type InsertActivityLog,
  type ActivityLogWithUser,
  type Project,
  type InsertProject,
  type ProjectWithDetails,
  type ProjectMember,
  type InsertProjectMember,
  type ProjectTemplate,
  type InsertProjectTemplate,
  type TemplateActivity,
  type InsertTemplateActivity,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, gte, lte, or } from "drizzle-orm";

export interface IStorage {
  // User operations (local auth)
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: Omit<UpsertUser, 'id'>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUsersBySector(sectorId: string): Promise<User[]>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  
  // Sector operations
  createSector(sector: InsertSector): Promise<Sector>;
  getSectors(): Promise<Sector[]>;
  getSector(id: string): Promise<Sector | undefined>;
  updateSector(id: string, updates: Partial<Sector>): Promise<Sector>;
  deleteSector(id: string): Promise<void>;
  
  // Activity operations
  createActivity(activity: InsertActivity): Promise<Activity>;
  getActivity(id: string): Promise<ActivityWithDetails | undefined>;
  getAllActivities(): Promise<ActivityWithDetails[]>;
  getActivitiesByCollaborator(collaboratorId: string): Promise<ActivityWithDetails[]>;
  getActivitiesBySector(sectorId: string): Promise<ActivityWithDetails[]>;
  updateActivity(id: string, updates: Partial<Activity>): Promise<Activity>;
  deleteActivity(id: string): Promise<void>;
  
  // Activity session operations
  startActivitySession(activityId: string): Promise<ActivitySession>;
  endActivitySession(sessionId: string, endTime: Date): Promise<ActivitySession>;
  getActiveSession(activityId: string): Promise<ActivitySession | undefined>;
  
  // Subtask operations
  createSubtask(subtask: InsertSubtask): Promise<Subtask>;
  getSubtask(id: string): Promise<Subtask | undefined>;
  getSubtasksByActivity(activityId: string): Promise<Subtask[]>;
  updateSubtask(id: string, data: { completed?: boolean }): Promise<Subtask>;
  deleteSubtask(id: string): Promise<void>;
  deleteSubtasksByActivity(activityId: string): Promise<void>;
  
  // Time adjustment operations
  createTimeAdjustmentLog(log: InsertTimeAdjustmentLog): Promise<TimeAdjustmentLog>;
  getTimeAdjustmentLogs(activityId: string): Promise<TimeAdjustmentLog[]>;
  
  // Activity log operations
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(limit?: number): Promise<ActivityLogWithUser[]>;
  getActivityLogsBySector(sectorId: string, limit?: number): Promise<ActivityLogWithUser[]>;
  
  // Project operations
  createProject(project: InsertProject): Promise<Project>;
  getProjects(): Promise<ProjectWithDetails[]>;
  getProjectById(id: string): Promise<ProjectWithDetails | undefined>;
  getProjectsBySector(sectorId: string): Promise<ProjectWithDetails[]>;
  getProjectsByUser(userId: string): Promise<ProjectWithDetails[]>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  
  // Project member operations
  addProjectMember(member: InsertProjectMember): Promise<ProjectMember>;
  removeProjectMember(projectId: string, userId: string): Promise<void>;
  isProjectMember(projectId: string, userId: string): Promise<boolean>;
  getProjectMembers(projectId: string): Promise<(ProjectMember & { user: User })[]>;
  
  // Dashboard queries
  getUserWithSector(id: string): Promise<UserWithSector | undefined>;
  getActiveActivitiesBySector(sectorId: string): Promise<ActivityWithDetails[]>;
  getCompletedActivitiesForPeriod(collaboratorId: string, startDate: Date, endDate: Date): Promise<ActivityWithDetails[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (local auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: Omit<UpsertUser, 'id'>): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.createdAt);
  }

  async getUsersBySector(sectorId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.sectorId, sectorId)).orderBy(users.createdAt);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Sector operations
  async createSector(sector: InsertSector): Promise<Sector> {
    const [newSector] = await db.insert(sectors).values(sector).returning();
    return newSector;
  }

  async getSectors(): Promise<Sector[]> {
    return await db.select().from(sectors);
  }

  async getSector(id: string): Promise<Sector | undefined> {
    const [sector] = await db.select().from(sectors).where(eq(sectors.id, id));
    return sector;
  }

  async updateSector(id: string, updates: Partial<Sector>): Promise<Sector> {
    const [sector] = await db
      .update(sectors)
      .set(updates)
      .where(eq(sectors.id, id))
      .returning();
    return sector;
  }

  async deleteSector(id: string): Promise<void> {
    await db.delete(sectors).where(eq(sectors.id, id));
  }

  // Activity operations
  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db.insert(activities).values(activity).returning();
    return newActivity;
  }

  async getActivity(id: string): Promise<ActivityWithDetails | undefined> {
    const [activity] = await db
      .select()
      .from(activities)
      .leftJoin(users, eq(activities.collaboratorId, users.id))
      .where(eq(activities.id, id));
    
    if (!activity.activities) return undefined;

    const subtasks = await this.getSubtasksByActivity(id);
    const sessions = await db
      .select()
      .from(activitySessions)
      .where(eq(activitySessions.activityId, id));

    return {
      ...activity.activities,
      collaborator: activity.users!,
      subtasks,
      sessions,
    };
  }

  async getAllActivities(): Promise<ActivityWithDetails[]> {
    const results = await db
      .select()
      .from(activities)
      .leftJoin(users, eq(activities.collaboratorId, users.id))
      .orderBy(desc(activities.createdAt));

    const activitiesWithDetails = await Promise.all(
      results.map(async (result) => {
        const subtasks = await this.getSubtasksByActivity(result.activities.id);
        return {
          ...result.activities,
          collaborator: result.users!,
          subtasks,
        };
      })
    );

    return activitiesWithDetails;
  }

  async getActivitiesByCollaborator(collaboratorId: string): Promise<ActivityWithDetails[]> {
    const results = await db
      .select()
      .from(activities)
      .leftJoin(users, eq(activities.collaboratorId, users.id))
      .where(eq(activities.collaboratorId, collaboratorId))
      .orderBy(desc(activities.createdAt));

    const activitiesWithDetails = await Promise.all(
      results.map(async (result) => {
        const subtasks = await this.getSubtasksByActivity(result.activities.id);
        return {
          ...result.activities,
          collaborator: result.users!,
          subtasks,
        };
      })
    );

    return activitiesWithDetails;
  }

  async getActivitiesBySector(sectorId: string): Promise<ActivityWithDetails[]> {
    const results = await db
      .select()
      .from(activities)
      .leftJoin(users, eq(activities.collaboratorId, users.id))
      .where(eq(users.sectorId, sectorId))
      .orderBy(desc(activities.createdAt));

    const activitiesWithDetails = await Promise.all(
      results.map(async (result) => {
        const subtasks = await this.getSubtasksByActivity(result.activities.id);
        return {
          ...result.activities,
          collaborator: result.users!,
          subtasks,
        };
      })
    );

    return activitiesWithDetails;
  }

  async updateActivity(id: string, updates: Partial<Activity>): Promise<Activity> {
    const [updated] = await db
      .update(activities)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(activities.id, id))
      .returning();
    return updated;
  }

  async deleteActivity(id: string): Promise<void> {
    await db.delete(activities).where(eq(activities.id, id));
  }

  // Activity session operations
  async startActivitySession(activityId: string): Promise<ActivitySession> {
    const [session] = await db
      .insert(activitySessions)
      .values({
        activityId,
        startedAt: new Date(),
      })
      .returning();
    return session;
  }

  async endActivitySession(sessionId: string, endTime: Date): Promise<ActivitySession> {
    const [session] = await db
      .update(activitySessions)
      .set({
        endedAt: endTime,
        duration: sql`EXTRACT(EPOCH FROM (${endTime} - started_at))::integer`,
      })
      .where(eq(activitySessions.id, sessionId))
      .returning();
    return session;
  }

  async getActiveSession(activityId: string): Promise<ActivitySession | undefined> {
    const [session] = await db
      .select()
      .from(activitySessions)
      .where(and(
        eq(activitySessions.activityId, activityId),
        sql`ended_at IS NULL`
      ));
    return session;
  }

  // Subtask operations
  async createSubtask(subtask: InsertSubtask): Promise<Subtask> {
    const [newSubtask] = await db.insert(subtasks).values(subtask).returning();
    return newSubtask;
  }

  async getSubtask(id: string): Promise<Subtask | undefined> {
    const [subtask] = await db
      .select()
      .from(subtasks)
      .where(eq(subtasks.id, id));
    return subtask;
  }

  async getSubtasksByActivity(activityId: string): Promise<Subtask[]> {
    return await db
      .select()
      .from(subtasks)
      .where(eq(subtasks.activityId, activityId));
  }

  async updateSubtask(id: string, data: { completed?: boolean }): Promise<Subtask> {
    const [updated] = await db
      .update(subtasks)
      .set(data)
      .where(eq(subtasks.id, id))
      .returning();
    return updated;
  }

  async deleteSubtask(id: string): Promise<void> {
    await db.delete(subtasks).where(eq(subtasks.id, id));
  }

  async deleteSubtasksByActivity(activityId: string): Promise<void> {
    await db.delete(subtasks).where(eq(subtasks.activityId, activityId));
  }

  // Time adjustment operations
  async createTimeAdjustmentLog(log: InsertTimeAdjustmentLog): Promise<TimeAdjustmentLog> {
    const [newLog] = await db.insert(timeAdjustmentLogs).values(log).returning();
    return newLog;
  }

  async getTimeAdjustmentLogs(activityId: string): Promise<TimeAdjustmentLog[]> {
    return await db
      .select()
      .from(timeAdjustmentLogs)
      .where(eq(timeAdjustmentLogs.activityId, activityId))
      .orderBy(desc(timeAdjustmentLogs.createdAt));
  }

  // Dashboard queries
  async getUserWithSector(id: string): Promise<UserWithSector | undefined> {
    const [result] = await db
      .select()
      .from(users)
      .leftJoin(sectors, eq(users.sectorId, sectors.id))
      .where(eq(users.id, id));
    
    if (!result.users) return undefined;
    
    return {
      ...result.users,
      sector: result.sectors || undefined,
    };
  }

  async getActiveActivitiesBySector(sectorId: string): Promise<ActivityWithDetails[]> {
    const results = await db
      .select()
      .from(activities)
      .leftJoin(users, eq(activities.collaboratorId, users.id))
      .where(and(
        eq(users.sectorId, sectorId),
        eq(activities.status, 'in_progress')
      ));

    return results.map(result => ({
      ...result.activities,
      collaborator: result.users!,
    }));
  }

  async getCompletedActivitiesForPeriod(
    collaboratorId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<ActivityWithDetails[]> {
    const results = await db
      .select()
      .from(activities)
      .leftJoin(users, eq(activities.collaboratorId, users.id))
      .where(and(
        eq(activities.collaboratorId, collaboratorId),
        eq(activities.status, 'completed'),
        gte(activities.completedAt, startDate),
        lte(activities.completedAt, endDate)
      ))
      .orderBy(desc(activities.completedAt));

    return results.map(result => ({
      ...result.activities,
      collaborator: result.users!,
    }));
  }

  // Activity log operations
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [result] = await db.insert(activityLogs).values(log).returning();
    return result;
  }

  async getActivityLogs(limit: number = 50, offset: number = 0, days: number = 7): Promise<ActivityLogWithUser[]> {
    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - days);
    
    const results = await db
      .select()
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .where(gte(activityLogs.createdAt, dateFilter))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return results.map(result => ({
      ...result.activity_logs,
      user: result.users!,
    }));
  }

  async getActivityLogsBySector(sectorId: string, limit: number = 50, offset: number = 0, days: number = 7): Promise<ActivityLogWithUser[]> {
    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - days);
    
    const results = await db
      .select()
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .where(and(
        eq(users.sectorId, sectorId),
        gte(activityLogs.createdAt, dateFilter)
      ))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return results.map(result => ({
      ...result.activity_logs,
      user: result.users!,
    }));
  }

  // Project operations
  async createProject(projectData: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(projectData).returning();
    return project;
  }

  async getProjects(): Promise<ProjectWithDetails[]> {
    const results = await db
      .select()
      .from(projects)
      .leftJoin(users, eq(projects.ownerId, users.id))
      .leftJoin(sectors, eq(projects.sectorId, sectors.id))
      .orderBy(desc(projects.createdAt));

    return results.map(result => ({
      ...result.projects,
      owner: result.users!,
      sector: result.sectors || undefined,
    }));
  }

  async getProjectById(id: string): Promise<ProjectWithDetails | undefined> {
    const results = await db
      .select()
      .from(projects)
      .leftJoin(users, eq(projects.ownerId, users.id))
      .leftJoin(sectors, eq(projects.sectorId, sectors.id))
      .where(eq(projects.id, id));

    if (results.length === 0) return undefined;

    const result = results[0];
    return {
      ...result.projects,
      owner: result.users!,
      sector: result.sectors || undefined,
    };
  }

  async getProjectsBySector(sectorId: string): Promise<ProjectWithDetails[]> {
    const results = await db
      .select()
      .from(projects)
      .leftJoin(users, eq(projects.ownerId, users.id))
      .leftJoin(sectors, eq(projects.sectorId, sectors.id))
      .where(eq(projects.sectorId, sectorId))
      .orderBy(desc(projects.createdAt));

    return results.map(result => ({
      ...result.projects,
      owner: result.users!,
      sector: result.sectors || undefined,
    }));
  }

  async getProjectsByUser(userId: string): Promise<ProjectWithDetails[]> {
    // Get projects owned by user or where user is a member
    const ownedResults = await db
      .select()
      .from(projects)
      .leftJoin(users, eq(projects.ownerId, users.id))
      .leftJoin(sectors, eq(projects.sectorId, sectors.id))
      .where(eq(projects.ownerId, userId))
      .orderBy(desc(projects.createdAt));

    const memberResults = await db
      .select({
        projects,
        owner: users,
        sectors,
      })
      .from(projectMembers)
      .leftJoin(projects, eq(projectMembers.projectId, projects.id))
      .leftJoin(users, eq(projects.ownerId, users.id))
      .leftJoin(sectors, eq(projects.sectorId, sectors.id))
      .where(eq(projectMembers.userId, userId))
      .orderBy(desc(projects.createdAt));

    // Combine and deduplicate
    const projectMap = new Map();
    
    ownedResults.forEach(result => {
      projectMap.set(result.projects.id, {
        ...result.projects,
        owner: result.users!,
        sector: result.sectors || undefined,
      });
    });

    memberResults.forEach(result => {
      if (result.projects && !projectMap.has(result.projects.id)) {
        projectMap.set(result.projects.id, {
          ...result.projects,
          owner: result.owner!,
          sector: result.sectors || undefined,
        });
      }
    });

    return Array.from(projectMap.values());
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const [project] = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: string): Promise<void> {
    // Delete project members first
    await db.delete(projectMembers).where(eq(projectMembers.projectId, id));
    // Delete project
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Project member operations
  async addProjectMember(memberData: InsertProjectMember): Promise<ProjectMember> {
    const [member] = await db.insert(projectMembers).values(memberData).returning();
    return member;
  }

  async removeProjectMember(projectId: string, userId: string): Promise<void> {
    await db
      .delete(projectMembers)
      .where(and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId)
      ));
  }

  async isProjectMember(projectId: string, userId: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(projectMembers)
      .where(and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId)
      ));
    return !!result;
  }

  async getProjectMembers(projectId: string): Promise<(ProjectMember & { user: User })[]> {
    const results = await db
      .select()
      .from(projectMembers)
      .leftJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, projectId));

    return results.map(result => ({
      ...result.project_members,
      user: result.users!,
    }));
  }
}

export const storage = new DatabaseStorage();
