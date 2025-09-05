import {
  users,
  sectors,
  plants,
  activities,
  subtasks,
  timeAdjustmentLogs,
  activitySessions,
  activityLogs,
  projects,
  projectMembers,
  projectTemplates,
  templateActivities,
  userSettings,
  type User,
  type UpsertUser,
  type Sector,
  type InsertSector,
  type Plant,
  type InsertPlant,
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
  type UserSettings,
  type InsertUserSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql, gte, lte, or } from "drizzle-orm";

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

  // Plant operations
  createPlant(plant: InsertPlant): Promise<Plant>;
  getPlants(): Promise<Plant[]>;
  getPlant(id: string): Promise<Plant | undefined>;
  updatePlant(id: string, updates: Partial<Plant>): Promise<Plant>;
  deletePlant(id: string): Promise<void>;
  getActivitiesByPlant(plantId: string): Promise<ActivityWithDetails[]>;

  // Activity operations
  createActivity(activity: InsertActivity): Promise<Activity>;
  createRetroactiveActivity(activity: InsertActivity, retroactiveStartDate: Date, retroactiveEndDate: Date): Promise<Activity>;
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
  getActivityLogsByUser(userId: string, limit?: number, offset?: number, days?: number): Promise<ActivityLogWithUser[]>;

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

  // User settings operations
  getUserSettings(userId: string): Promise<UserSettings | null>;
  updateUserSettings(userId: string, settings: Partial<InsertUserSettings>): Promise<UserSettings>;
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

  // Plant operations
  async createPlant(plant: InsertPlant): Promise<Plant> {
    const [newPlant] = await db.insert(plants).values(plant).returning();
    return newPlant;
  }

  async getPlants(): Promise<Plant[]> {
    return await db.select().from(plants).where(eq(plants.isActive, true)).orderBy(plants.name);
  }

  async getPlant(id: string): Promise<Plant | undefined> {
    const [plant] = await db.select().from(plants).where(eq(plants.id, id));
    return plant;
  }

  async updatePlant(id: string, updates: Partial<Plant>): Promise<Plant> {
    const [plant] = await db
      .update(plants)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(plants.id, id))
      .returning();
    return plant;
  }

  async deletePlant(id: string): Promise<void> {
    await db.delete(plants).where(eq(plants.id, id));
  }

  async getActivitiesByPlant(plantId: string): Promise<ActivityWithDetails[]> {
    const results = await db
      .select()
      .from(activities)
      .leftJoin(users, eq(activities.collaboratorId, users.id))
      .leftJoin(plants, eq(activities.plantId, plants.id))
      .where(eq(activities.plantId, plantId));

    return results.map(result => ({
      ...result.activities,
      collaborator: result.users!,
      plantRef: result.plants || undefined,
    })) as ActivityWithDetails[];
  }

  // Activity operations
  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db.insert(activities).values(activity as any).returning();
    return newActivity;
  }

  async createRetroactiveActivity(
    activity: InsertActivity,
    retroactiveStartDate: Date,
    retroactiveEndDate: Date
  ): Promise<Activity> {
    // Para atividades retroativas, use SQL direto para definir as datas
    const [newActivity] = await db.insert(activities).values({
      ...activity,
      createdAt: retroactiveStartDate,
      startedAt: retroactiveStartDate,
      completedAt: retroactiveEndDate,
    } as any).returning();
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
      .leftJoin(projects, eq(activities.projectId, projects.id))
      .leftJoin(plants, eq(activities.plantId, plants.id))
      .orderBy(desc(activities.createdAt));

    const activitiesWithDetails = await Promise.all(
      results.map(async (result) => {
        const subtasks = await this.getSubtasksByActivity(result.activities.id);
        let activeSession = null;

        // Include active session for in-progress activities
        if (result.activities.status === 'in_progress') {
          activeSession = await this.getActiveSession(result.activities.id);
        }

        return {
          ...result.activities,
          collaborator: result.users!,
          project: result.projects || null,
          plantRef: result.plants || undefined,
          subtasks,
          activeSession,
        } as ActivityWithDetails;
      })
    );

    return activitiesWithDetails;
  }

  async getActivitiesByCollaborator(collaboratorId: string): Promise<ActivityWithDetails[]> {
    const results = await db
      .select()
      .from(activities)
      .leftJoin(users, eq(activities.collaboratorId, users.id))
      .leftJoin(projects, eq(activities.projectId, projects.id))
      .leftJoin(plants, eq(activities.plantId, plants.id))
      .where(eq(activities.collaboratorId, collaboratorId))
      .orderBy(desc(activities.createdAt));

    const activitiesWithDetails = await Promise.all(
      results.map(async (result) => {
        const subtasks = await this.getSubtasksByActivity(result.activities.id);
        let activeSession = null;

        // Include active session for in-progress activities
        if (result.activities.status === 'in_progress') {
          activeSession = await this.getActiveSession(result.activities.id);
        }

        return {
          ...result.activities,
          collaborator: result.users!,
          project: result.projects || null,
          plantRef: result.plants || undefined,
          subtasks,
          activeSession,
        } as ActivityWithDetails;
      })
    );

    return activitiesWithDetails;
  }

  async getActivitiesBySector(sectorId: string): Promise<ActivityWithDetails[]> {
    const results = await db
      .select()
      .from(activities)
      .leftJoin(users, eq(activities.collaboratorId, users.id))
      .leftJoin(projects, eq(activities.projectId, projects.id))
      .leftJoin(plants, eq(activities.plantId, plants.id))
      .where(eq(users.sectorId, sectorId))
      .orderBy(desc(activities.createdAt));

    const activitiesWithDetails = await Promise.all(
      results.map(async (result) => {
        const subtasks = await this.getSubtasksByActivity(result.activities.id);
        let activeSession = null;

        // Include active session for in-progress activities
        if (result.activities.status === 'in_progress') {
          activeSession = await this.getActiveSession(result.activities.id);
        }

        return {
          ...result.activities,
          collaborator: result.users!,
          project: result.projects || null,
          plantRef: result.plants || undefined,
          subtasks,
          activeSession,
        } as ActivityWithDetails;
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
    // Get the session first to calculate duration correctly
    const [currentSession] = await db
      .select()
      .from(activitySessions)
      .where(eq(activitySessions.id, sessionId));

    if (!currentSession) {
      throw new Error('Session not found');
    }

    // Calculate duration in JavaScript to avoid timezone issues
    const startTime = new Date(currentSession.startedAt);
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    const [session] = await db
      .update(activitySessions)
      .set({
        endedAt: endTime,
        duration: duration,
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
      .where(eq(subtasks.activityId, activityId))
      .orderBy(asc(subtasks.createdAt));
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
      project: null,
      plantRef: undefined,
      subtasks: [],
      activeSession: null,
    } as ActivityWithDetails));
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
    })) as ActivityWithDetails[];
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

  async getActivityLogsByUser(userId: string, limit: number = 50, offset: number = 0, days: number = 7): Promise<ActivityLogWithUser[]> {
    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - days);

    const results = await db
      .select()
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .where(and(
        eq(activityLogs.userId, userId),
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

  async getDbStructure(): Promise<any> {
    try {
      // Verificar estrutura da tabela activities
      const activitiesStructure = await db.execute(sql`
        SELECT column_name, data_type, is_nullable, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'activities' 
        ORDER BY ordinal_position;
      `);

      // Verificar estrutura da tabela plants
      const plantsStructure = await db.execute(sql`
        SELECT column_name, data_type, is_nullable, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'plants' 
        ORDER BY ordinal_position;
      `);

      // Listar todas as tabelas
      const tables = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `);

      return {
        activities: activitiesStructure.rows,
        plants: plantsStructure.rows,
        tables: tables.rows
      };
    } catch (error) {
      console.error('Error getting DB structure:', error);
      throw error;
    }
  }

  // User settings operations
  async getUserSettings(userId: string): Promise<UserSettings | null> {
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));

    if (!settings) {
      // Create default settings if they don't exist
      const [newSettings] = await db
        .insert(userSettings)
        .values({
          userId,
          teamNotificationsEnabled: false,
          cardViewMode: 'comfortable',
        })
        .returning();
      return newSettings;
    }

    return settings;
  }

  async updateUserSettings(userId: string, updates: Partial<InsertUserSettings>): Promise<UserSettings> {
    // First check if settings exist
    const existingSettings = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));

    if (existingSettings.length === 0) {
      // Create new settings
      const [newSettings] = await db
        .insert(userSettings)
        .values({
          userId,
          ...updates,
        })
        .returning();
      return newSettings;
    } else {
      // Update existing settings
      const [updatedSettings] = await db
        .update(userSettings)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, userId))
        .returning();
      return updatedSettings;
    }
  }
}

export const storage = new DatabaseStorage();
