import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Enums
export const userRoleEnum = pgEnum('user_role', ['collaborator', 'sector_chief', 'admin']);
export const activityTypeEnum = pgEnum('activity_type', ['simple', 'checklist']);
export const activityStatusEnum = pgEnum('activity_status', ['next', 'in_progress', 'paused', 'completed', 'cancelled']);
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high']);
export const projectStatusEnum = pgEnum('project_status', ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled']);

// Sectors table
export const sectors = pgTable("sectors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Users table - local authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 50 }).unique().notNull(),
  password: varchar("password", { length: 255 }).notNull(), // bcrypt hash
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  sectorId: varchar("sector_id").references(() => sectors.id),
  role: userRoleEnum("role").notNull().default('collaborator'),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: projectStatusEnum("status").notNull().default('planning'),
  priority: priorityEnum("priority").notNull().default('medium'),
  ownerId: varchar("owner_id").references(() => users.id).notNull(),
  sectorId: varchar("sector_id").references(() => sectors.id),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  estimatedHours: integer("estimated_hours"),
  actualHours: integer("actual_hours").default(0),
  completionPercentage: integer("completion_percentage").default(0),
  color: varchar("color", { length: 7 }).default('#8B5CF6'), // Default purple color
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project members table (many-to-many)
export const projectMembers = pgTable("project_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  role: varchar("role", { length: 50 }).default('member'), // 'owner', 'manager', 'member'
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Project templates table
export const projectTemplates = pgTable("project_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  estimatedHours: integer("estimated_hours"),
  color: varchar("color", { length: 7 }).default('#8B5CF6'),
  createdById: varchar("created_by_id").references(() => users.id).notNull(),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Template activities (pre-defined activities for templates)
export const templateActivities = pgTable("template_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").references(() => projectTemplates.id).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  type: activityTypeEnum("type").notNull(),
  priority: priorityEnum("priority").notNull(),
  estimatedHours: integer("estimated_hours"),
  order: integer("order").default(0),
  dependsOnId: varchar("depends_on_id"), // Reference to another template activity
  createdAt: timestamp("created_at").defaultNow(),
});

// Activities table
export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 500 }).notNull(),
  type: activityTypeEnum("type").notNull(),
  priority: priorityEnum("priority").notNull(),
  plant: varchar("plant", { length: 100 }).notNull(),
  projectId: varchar("project_id").references(() => projects.id),
  project: varchar("project", { length: 255 }), // Manter para compatibilidade
  requester: varchar("requester", { length: 255 }),
  status: activityStatusEnum("status").notNull().default('next'),
  totalTime: integer("total_time").default(0), // in seconds
  collaboratorId: varchar("collaborator_id").references(() => users.id).notNull(),
  evidenceUrl: varchar("evidence_url"),
  completionNotes: text("completion_notes"),
  isRetroactive: boolean("is_retroactive").default(false),
  startedAt: timestamp("started_at"),
  pausedAt: timestamp("paused_at"),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subtasks table
export const subtasks = pgTable("subtasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  activityId: varchar("activity_id").references(() => activities.id).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Time adjustment logs table
export const timeAdjustmentLogs = pgTable("time_adjustment_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  activityId: varchar("activity_id").references(() => activities.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  previousTime: integer("previous_time").notNull(), // in seconds
  newTime: integer("new_time").notNull(), // in seconds
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Activity sessions for tracking start/pause events
export const activitySessions = pgTable("activity_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  activityId: varchar("activity_id").references(() => activities.id).notNull(),
  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at"),
  duration: integer("duration").default(0), // in seconds
  createdAt: timestamp("created_at").defaultNow(),
});

// Activity logs for tracking all activity actions (timeline/feed)
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  activityId: varchar("activity_id").references(() => activities.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  action: varchar("action").notNull(), // 'created', 'started', 'paused', 'completed', 'cancelled'
  activityTitle: varchar("activity_title").notNull(),
  timeSpent: integer("time_spent"), // in seconds, only for completed activities
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const sectorsRelations = relations(sectors, ({ many }) => ({
  users: many(users),
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  sector: one(sectors, {
    fields: [projects.sectorId],
    references: [sectors.id],
  }),
  activities: many(activities),
  members: many(projectMembers),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  }),
}));

export const projectTemplatesRelations = relations(projectTemplates, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [projectTemplates.createdById],
    references: [users.id],
  }),
  activities: many(templateActivities),
}));

export const templateActivitiesRelations = relations(templateActivities, ({ one }) => ({
  template: one(projectTemplates, {
    fields: [templateActivities.templateId],
    references: [projectTemplates.id],
  }),
  dependsOn: one(templateActivities, {
    fields: [templateActivities.dependsOnId],
    references: [templateActivities.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  sector: one(sectors, {
    fields: [users.sectorId],
    references: [sectors.id],
  }),
  activities: many(activities),
  ownedProjects: many(projects),
  projectMemberships: many(projectMembers),
  createdTemplates: many(projectTemplates),
  timeAdjustmentLogs: many(timeAdjustmentLogs),
  activityLogs: many(activityLogs),
}));

export const activitiesRelations = relations(activities, ({ one, many }) => ({
  collaborator: one(users, {
    fields: [activities.collaboratorId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [activities.projectId],
    references: [projects.id],
  }),
  subtasks: many(subtasks),
  timeAdjustmentLogs: many(timeAdjustmentLogs),
  sessions: many(activitySessions),
  logs: many(activityLogs),
}));

export const subtasksRelations = relations(subtasks, ({ one }) => ({
  activity: one(activities, {
    fields: [subtasks.activityId],
    references: [activities.id],
  }),
}));

export const timeAdjustmentLogsRelations = relations(timeAdjustmentLogs, ({ one }) => ({
  activity: one(activities, {
    fields: [timeAdjustmentLogs.activityId],
    references: [activities.id],
  }),
  user: one(users, {
    fields: [timeAdjustmentLogs.userId],
    references: [users.id],
  }),
}));

export const activitySessionsRelations = relations(activitySessions, ({ one }) => ({
  activity: one(activities, {
    fields: [activitySessions.activityId],
    references: [activities.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  activity: one(activities, {
    fields: [activityLogs.activityId],
    references: [activities.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertSectorSchema = createInsertSchema(sectors).omit({ id: true, createdAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  actualHours: true,
  completionPercentage: true
});
export const insertProjectMemberSchema = createInsertSchema(projectMembers).omit({ id: true, joinedAt: true });
export const insertProjectTemplateSchema = createInsertSchema(projectTemplates).omit({ id: true, createdAt: true });
export const insertTemplateActivitySchema = createInsertSchema(templateActivities).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const loginSchema = z.object({
  username: z.string().min(1, "Username é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});
export const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});
export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  startedAt: true,
  pausedAt: true,
  completedAt: true,
  cancelledAt: true,
}).extend({
  collaboratorId: z.string().optional(), // Será preenchido no backend
});
export const insertSubtaskSchema = createInsertSchema(subtasks).omit({ id: true, createdAt: true });
export const insertTimeAdjustmentLogSchema = createInsertSchema(timeAdjustmentLogs).omit({ id: true, createdAt: true });
export const insertActivitySessionSchema = createInsertSchema(activitySessions).omit({ id: true, createdAt: true });
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, createdAt: true });

// Types
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;
export type ProjectTemplate = typeof projectTemplates.$inferSelect;
export type InsertProjectTemplate = z.infer<typeof insertProjectTemplateSchema>;
export type TemplateActivity = typeof templateActivities.$inferSelect;
export type InsertTemplateActivity = z.infer<typeof insertTemplateActivitySchema>;
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type Sector = typeof sectors.$inferSelect;
export type InsertSector = z.infer<typeof insertSectorSchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Subtask = typeof subtasks.$inferSelect;
export type InsertSubtask = z.infer<typeof insertSubtaskSchema>;
export type TimeAdjustmentLog = typeof timeAdjustmentLogs.$inferSelect;
export type InsertTimeAdjustmentLog = z.infer<typeof insertTimeAdjustmentLogSchema>;
export type ActivitySession = typeof activitySessions.$inferSelect;
export type InsertActivitySession = z.infer<typeof insertActivitySessionSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

// Extended types with relations
export type ActivityWithDetails = Activity & {
  collaborator: User;
  project?: Project;
  subtasks?: Subtask[];
  sessions?: ActivitySession[];
};

export type ProjectWithDetails = Project & {
  owner: User;
  sector?: Sector;
  activities?: Activity[];
  members?: (ProjectMember & { user: User })[];
};

export type ProjectTemplateWithDetails = ProjectTemplate & {
  createdBy: User;
  activities: TemplateActivity[];
};

export type UserWithSector = User & {
  sector?: Sector;
};

export type ActivityLogWithUser = ActivityLog & {
  user: User;
};

// Dashboard statistics type
export type DashboardStats = {
  todayHours: number;
  todayMinutes: number;
  weekHours: number;
  weekMinutes: number;
  totalActivities: number;
  completedActivities: number;
};
