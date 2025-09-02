import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, login, logout, getCurrentUser } from "./auth";
import { insertActivitySchema, insertSubtaskSchema, insertTimeAdjustmentLogSchema, insertSectorSchema, insertProjectSchema, insertProjectMemberSchema, insertPlantSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType } from "docx";
import { upload, getFilePath, getFileUrl, deleteFile, UPLOAD_BASE_PATH } from "./uploadConfig";
import path from "path";
import fs from "fs";

interface WebSocketClient extends WebSocket {
  userId?: string;
  sectorId?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.post('/api/auth/login', login);
  app.post('/api/auth/logout', logout);
  app.get('/api/auth/user', isAuthenticated, getCurrentUser);

  // Temporary route to check database structure
  app.get('/api/debug/db-structure', async (req, res) => {
    try {
      const structure = await storage.getDbStructure();
      res.json(structure);
    } catch (error) {
      console.error("Error getting DB structure:", error);
      res.status(500).json({
        message: "Failed to get DB structure",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Sector routes
  app.get('/api/sectors', isAuthenticated, async (req, res) => {
    try {
      const sectors = await storage.getSectors();
      res.json(sectors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sectors" });
    }
  });

  app.post('/api/sectors', isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can create sectors" });
      }

      const sectorData = insertSectorSchema.parse(req.body);
      const sector = await storage.createSector(sectorData);
      res.status(201).json(sector);
    } catch (error) {
      console.error("Error creating sector:", error);
      res.status(500).json({ message: "Failed to create sector" });
    }
  });

  app.put('/api/sectors/:id', isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can update sectors" });
      }

      const { id } = req.params;
      const updates = insertSectorSchema.partial().parse(req.body);
      const sector = await storage.updateSector(id, updates);
      res.json(sector);
    } catch (error) {
      console.error("Error updating sector:", error);
      res.status(500).json({ message: "Failed to update sector" });
    }
  });

  app.delete('/api/sectors/:id', isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can delete sectors" });
      }

      const { id } = req.params;

      // Check if sector has users before deleting
      const usersInSector = await storage.getUsersBySector(id);
      if (usersInSector.length > 0) {
        return res.status(400).json({
          message: "Cannot delete sector with assigned users. Please reassign users first."
        });
      }

      await storage.deleteSector(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting sector:", error);
      res.status(500).json({ message: "Failed to delete sector" });
    }
  });

  // Plants routes
  app.get('/api/plants', isAuthenticated, async (req, res) => {
    try {
      const plants = await storage.getPlants();
      res.json(plants);
    } catch (error) {
      console.error("Error fetching plants:", error);
      res.status(500).json({ message: "Failed to fetch plants" });
    }
  });

  app.post('/api/plants', isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can create plants" });
      }

      const plantData = insertPlantSchema.parse(req.body);
      const plant = await storage.createPlant(plantData);
      res.status(201).json(plant);
    } catch (error) {
      console.error("Error creating plant:", error);
      res.status(500).json({ message: "Failed to create plant" });
    }
  });

  app.put('/api/plants/:id', isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can update plants" });
      }

      const { id } = req.params;
      const updates = insertPlantSchema.partial().parse(req.body);
      const plant = await storage.updatePlant(id, updates);
      res.json(plant);
    } catch (error) {
      console.error("Error updating plant:", error);
      res.status(500).json({ message: "Failed to update plant" });
    }
  });

  app.delete('/api/plants/:id', isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can delete plants" });
      }

      const { id } = req.params;

      // Check if plant has activities before deleting
      const activitiesInPlant = await storage.getActivitiesByPlant(id);
      if (activitiesInPlant.length > 0) {
        return res.status(400).json({
          message: "Cannot delete plant with associated activities. Please reassign activities first."
        });
      }

      await storage.deletePlant(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting plant:", error);
      res.status(500).json({ message: "Failed to delete plant" });
    }
  });

  // User management routes
  app.get('/api/users', isAuthenticated, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.user!.id);
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'sector_chief')) {
        return res.status(403).json({ message: "Access denied" });
      }

      let users;
      if (currentUser.role === 'admin') {
        users = await storage.getAllUsers();
      } else if (currentUser.role === 'sector_chief' && currentUser.sectorId) {
        users = await storage.getUsersBySector(currentUser.sectorId);
      }

      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/users/register', isAuthenticated, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.user!.id);
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'sector_chief')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { username, password, email, firstName, lastName, role, sectorId } = req.body;

      // Validation
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Role restrictions
      if (currentUser.role === 'sector_chief') {
        // Sector chiefs can only create collaborators in their own sector
        if (role !== 'collaborator') {
          return res.status(403).json({ message: "Sector chiefs can only create collaborators" });
        }
        if (sectorId !== currentUser.sectorId) {
          return res.status(403).json({ message: "Can only create users in your own sector" });
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const userData = {
        username,
        password: hashedPassword,
        email,
        firstName,
        lastName,
        role: role || 'collaborator',
        sectorId: sectorId || currentUser.sectorId,
        isActive: true,
      };

      const newUser = await storage.createUser(userData);

      // Remove password from response
      const { password: _, ...userResponse } = newUser;
      res.status(201).json(userResponse);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch('/api/users/:id', isAuthenticated, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.user!.id);
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'sector_chief')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const userId = req.params.id;
      const targetUser = await storage.getUser(userId);

      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Sector chiefs can only manage users in their sector
      if (currentUser.role === 'sector_chief') {
        if (targetUser.sectorId !== currentUser.sectorId) {
          return res.status(403).json({ message: "Can only manage users in your sector" });
        }
      }

      const updates = req.body;

      // Hash password if provided, otherwise remove from updates
      if (updates.password && updates.password.trim() !== '') {
        updates.password = await bcrypt.hash(updates.password, 10);
      } else {
        // Remove password field from updates to preserve existing password
        delete updates.password;
      }

      const updatedUser = await storage.updateUser(userId, updates);

      // Remove password from response
      const { password: _, ...userResponse } = updatedUser;
      res.json(userResponse);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Activity routes
  app.get('/api/activities', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let activities;
      if (user.role === 'admin') {
        activities = await storage.getAllActivities();
      } else if (user.role === 'sector_chief' && user.sectorId) {
        activities = await storage.getActivitiesBySector(user.sectorId);
      } else {
        activities = await storage.getActivitiesByCollaborator(userId);
      }

      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  app.get('/api/activities/:id', isAuthenticated, async (req, res) => {
    try {
      const activity = await storage.getActivity(req.params.id);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }

      const userId = req.user!.id;
      const user = await storage.getUser(userId);

      // Check permissions
      if (user?.role === 'collaborator' && activity.collaboratorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (user?.role === 'sector_chief' && activity.collaborator.sectorId !== user.sectorId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(activity);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  app.post('/api/activities', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;

      const {
        isRetroactive,
        retroactiveStartDate,
        retroactiveStartTime,
        retroactiveEndDate,
        retroactiveEndTime,
        ...activityData
      } = req.body;

      const fullActivityData = {
        ...activityData,
        collaboratorId: userId,
      };

      // Handle retroactive activities
      if (isRetroactive && retroactiveStartDate && retroactiveStartTime && retroactiveEndDate && retroactiveEndTime) {
        // Parse dates with local timezone
        const startDateTime = new Date(`${retroactiveStartDate}T${retroactiveStartTime}:00`);
        const endDateTime = new Date(`${retroactiveEndDate}T${retroactiveEndTime}:00`);

        // Validate dates
        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
          return res.status(400).json({ message: "Invalid date or time format" });
        }

        if (startDateTime >= endDateTime) {
          return res.status(400).json({ message: "End time must be after start time" });
        }

        if (endDateTime > new Date()) {
          return res.status(400).json({ message: "End time cannot be in the future" });
        }

        // Calculate total time in milliseconds
        const totalTime = endDateTime.getTime() - startDateTime.getTime();

        fullActivityData.status = 'completed';
        fullActivityData.totalTime = totalTime;
        fullActivityData.startedAt = startDateTime;
        fullActivityData.completedAt = endDateTime;
      }

      const validatedActivityData = insertActivitySchema.parse(fullActivityData);

      // Check if user has an active activity (only for non-retroactive activities)
      if (!isRetroactive && validatedActivityData.status === 'in_progress') {
        const userActivities = await storage.getActivitiesByCollaborator(userId);
        const hasActiveActivity = userActivities.some(a => a.status === 'in_progress');

        if (hasActiveActivity) {
          return res.status(400).json({ message: "You already have an active activity" });
        }
      }

      const activity = await storage.createActivity(validatedActivityData);

      // Create subtasks if provided
      if (req.body.subtasks && Array.isArray(req.body.subtasks)) {
        for (const subtaskData of req.body.subtasks) {
          await storage.createSubtask({
            ...subtaskData,
            activityId: activity.id,
          });
        }
      }

      // Start session if activity is in progress
      if (activity.status === 'in_progress') {
        await storage.startActivitySession(activity.id);
        await storage.updateActivity(activity.id, { startedAt: new Date() });
      }

      const fullActivity = await storage.getActivity(activity.id);

      // Create activity log for creation
      let logAction = 'created';
      let timeSpent = undefined;

      if (activity.status === 'in_progress') {
        logAction = 'started';
      } else if (activity.status === 'completed' && isRetroactive) {
        logAction = 'completed';
        timeSpent = activity.totalTime;
      }

      await storage.createActivityLog({
        activityId: activity.id,
        userId,
        action: logAction,
        activityTitle: activity.title,
        timeSpent,
      });

      // Broadcast to WebSocket clients
      broadcastToSector(fullActivity!.collaborator.sectorId!, {
        type: 'activity_created',
        activity: fullActivity,
      });

      res.status(201).json(fullActivity);
    } catch (error) {
      console.error("Error creating activity:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create activity" });
    }
  });

  app.patch('/api/activities/:id', isAuthenticated, async (req, res) => {
    try {
      const activityId = req.params.id;
      const userId = req.user!.id;

      const activity = await storage.getActivity(activityId);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }

      // Check permissions
      if (activity.collaboratorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Prevent editing completed/cancelled activities (except for reverting completed to paused)
      const isRevertingToPaused = activity.status === 'completed' && req.body.status === 'paused';
      if ((activity.status === 'completed' || activity.status === 'cancelled') && !isRevertingToPaused) {
        return res.status(400).json({ message: "Cannot edit completed or cancelled activities" });
      }

      const updates = req.body;

      // Handle status changes
      if (updates.status) {
        if (updates.status === 'in_progress') {
          // Check if user has another active activity
          const userActivities = await storage.getActivitiesByCollaborator(userId);
          const hasOtherActiveActivity = userActivities.some(a =>
            a.id !== activityId && a.status === 'in_progress'
          );

          if (hasOtherActiveActivity) {
            return res.status(400).json({ message: "You already have an active activity" });
          }

          updates.startedAt = new Date();
          await storage.startActivitySession(activityId);
        }

        if (updates.status === 'paused') {
          const activeSession = await storage.getActiveSession(activityId);
          if (activeSession) {
            const endedSession = await storage.endActivitySession(activeSession.id, new Date());
            // Update total time
            const currentTotal = activity.totalTime || 0;
            updates.totalTime = currentTotal + (endedSession.duration || 0);
          }
          updates.pausedAt = new Date();
        }

        if (updates.status === 'completed') {
          const activeSession = await storage.getActiveSession(activityId);
          if (activeSession) {
            const endedSession = await storage.endActivitySession(activeSession.id, new Date());
            const currentTotal = activity.totalTime || 0;
            updates.totalTime = currentTotal + (endedSession.duration || 0);
          }
          updates.completedAt = new Date();
        }

        if (updates.status === 'cancelled') {
          const activeSession = await storage.getActiveSession(activityId);
          if (activeSession) {
            await storage.endActivitySession(activeSession.id, new Date());
          }
          updates.cancelledAt = new Date();
        }
      }

      // Map notes to completionNotes for completed activities
      if (updates.notes) {
        updates.completionNotes = updates.notes;
        delete updates.notes;
      }

      // Handle subtasks update for checklist activities
      if (updates.subtasks && activity.type === 'checklist') {
        // Remove existing subtasks and create new ones
        await storage.deleteSubtasksByActivity(activityId);

        // Create new subtasks preserving their completion status
        for (const subtask of updates.subtasks) {
          await storage.createSubtask({
            activityId,
            title: subtask.title,
            completed: subtask.completed || false,
          });
        }

        // Remove subtasks from updates to prevent DB error
        delete updates.subtasks;
      }

      const updatedActivity = await storage.updateActivity(activityId, updates);
      const fullActivity = await storage.getActivity(activityId);

      // Create activity log for status changes
      if (updates.status && updates.status !== activity.status) {
        let action = '';
        let timeSpent = undefined;

        switch (updates.status) {
          case 'in_progress':
            action = 'started';
            break;
          case 'paused':
            action = 'paused';
            break;
          case 'completed':
            action = 'completed';
            timeSpent = updates.totalTime || activity.totalTime || 0;
            break;
          case 'cancelled':
            action = 'cancelled';
            break;
        }

        if (action) {
          await storage.createActivityLog({
            activityId,
            userId,
            action,
            activityTitle: activity.title,
            timeSpent,
          });
        }
      }

      // Broadcast to WebSocket clients
      broadcastToSector(fullActivity!.collaborator.sectorId!, {
        type: 'activity_updated',
        activity: fullActivity,
      });

      // Also broadcast to all admins
      broadcastToAdmins({
        type: 'activity_updated',
        activity: fullActivity,
      });

      res.json(fullActivity);
    } catch (error) {
      console.error("Error updating activity:", error);
      res.status(500).json({ message: "Failed to update activity" });
    }
  });

  // Time adjustment route
  app.post('/api/activities/:id/adjust-time', isAuthenticated, async (req: any, res) => {
    try {
      const activityId = req.params.id;
      const userId = req.user.id;
      const { newTotalTime, reason, previousTotalTime } = req.body;

      const activity = await storage.getActivity(activityId);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }

      // Check permissions
      if (activity.collaboratorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Allow time adjustment for paused and completed activities
      if (activity.status !== 'completed' && activity.status !== 'paused') {
        return res.status(400).json({ message: "Can only adjust time for paused or completed activities" });
      }

      // Create audit log
      await storage.createTimeAdjustmentLog({
        activityId,
        userId,
        previousTime: previousTotalTime || activity.totalTime || 0,
        newTime: newTotalTime,
        reason,
      });

      // Update activity time
      await storage.updateActivity(activityId, { totalTime: newTotalTime });

      const updatedActivity = await storage.getActivity(activityId);

      // Broadcast to WebSocket clients
      broadcastToSector(updatedActivity!.collaborator.sectorId!, {
        type: 'activity_updated',
        activity: updatedActivity,
      });

      // Also broadcast to all admins
      broadcastToAdmins({
        type: 'activity_updated',
        activity: updatedActivity,
      });

      res.json(updatedActivity);
    } catch (error) {
      console.error("Error adjusting time:", error);
      res.status(500).json({ message: "Failed to adjust time" });
    }
  });

  // Activity logs route (feed/timeline)
  app.get('/api/activity-logs', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Parse query parameters for pagination and filtering
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50); // Max 50 per page
      const days = parseInt(req.query.days as string) || 7; // Default: last 7 days
      const offset = (page - 1) * limit;
      const filterUserId = req.query.userId as string; // Parâmetro para filtrar por usuário

      let logs: any[];
      if (user.role === 'admin') {
        // Admin pode ver todos os logs ou filtrar por usuário específico
        if (filterUserId) {
          logs = await storage.getActivityLogsByUser(filterUserId, limit, offset, days);
        } else {
          logs = await storage.getActivityLogs(limit, offset, days);
        }
      } else if (user.role === 'sector_chief' && user.sectorId) {
        // Chefe de setor pode ver logs do setor ou filtrar por usuário específico do setor
        if (filterUserId) {
          logs = await storage.getActivityLogsByUser(filterUserId, limit, offset, days);
        } else {
          logs = await storage.getActivityLogsBySector(user.sectorId, limit, offset, days);
        }
      } else {
        // Colaboradores só podem ver seus próprios logs
        logs = await storage.getActivityLogsByUser(userId, limit, offset, days);
      }

      // Add cache headers for better performance
      res.set('Cache-Control', 'public, max-age=30'); // Cache for 30 seconds
      res.json({
        logs,
        pagination: {
          page,
          limit,
          hasMore: logs.length === limit
        }
      });
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // Subtask routes
  app.post('/api/activities/:id/subtasks', isAuthenticated, async (req: any, res) => {
    try {
      const activityId = req.params.id;
      const userId = req.user.id;

      const activity = await storage.getActivity(activityId);
      if (!activity || activity.collaboratorId !== userId) {
        return res.status(404).json({ message: "Activity not found" });
      }

      const subtaskData = insertSubtaskSchema.parse({
        ...req.body,
        activityId,
      });

      const subtask = await storage.createSubtask(subtaskData);
      res.status(201).json(subtask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create subtask" });
    }
  });

  // Endpoint duplicado removido - usar o endpoint com validações abaixo

  // Subtask routes
  app.patch('/api/subtasks/:id', isAuthenticated, async (req, res) => {
    try {
      const subtaskId = req.params.id;
      const userId = req.user!.id;
      const { completed } = req.body;

      console.log('Updating subtask:', { subtaskId, userId, completed });

      // Get subtask with activity details
      const subtask = await storage.getSubtask(subtaskId);
      if (!subtask) {
        return res.status(404).json({ message: "Subtask not found" });
      }

      // Get activity to check permissions
      const activity = await storage.getActivity(subtask.activityId);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }

      // Check permissions - only the activity owner can update subtasks
      if (activity.collaboratorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Update subtask
      const updatedSubtask = await storage.updateSubtask(subtaskId, { completed });

      // Get updated activity with all subtasks
      const fullActivity = await storage.getActivity(activity.id);

      // Broadcast to WebSocket clients if sector exists
      if (fullActivity?.collaborator?.sectorId) {
        broadcastToSector(fullActivity.collaborator.sectorId, {
          type: 'subtask_updated',
          activity: fullActivity,
          subtask: updatedSubtask,
        });
      }

      res.json(updatedSubtask);
    } catch (error) {
      console.error("Error updating subtask:", error);
      res.status(500).json({ message: "Failed to update subtask", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // File upload routes
  app.post('/api/activities/:activityId/upload-evidence', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      console.log(`[UPLOAD] Iniciando upload para atividade ${req.params.activityId}`);
      const { activityId } = req.params;
      const userId = req.user.id;

      if (!req.file) {
        console.log(`[UPLOAD] Nenhum arquivo foi enviado`);
        return res.status(400).json({ message: "Nenhum arquivo foi enviado" });
      }

      console.log(`[UPLOAD] Arquivo recebido: ${req.file.originalname}, tamanho: ${req.file.size}, salvo em: ${req.file.path}`);

      // Verificar se a atividade existe e se o usuário tem permissão
      const activity = await storage.getActivity(activityId);
      if (!activity) {
        console.log(`[UPLOAD] Atividade ${activityId} não encontrada`);
        // Deletar arquivo se atividade não existir
        await deleteFile(req.file.path);
        return res.status(404).json({ message: "Activity not found" });
      }

      // Verificar permissão (apenas o colaborador da atividade pode fazer upload)
      if (activity.collaboratorId !== userId) {
        console.log(`[UPLOAD] Usuário ${userId} não tem permissão para atividade ${activityId}`);
        // Deletar arquivo se usuário não tem permissão
        await deleteFile(req.file.path);
        return res.status(403).json({ message: "Access denied" });
      }

      // Gerar URL relativa do arquivo
      const fileUrl = getFileUrl(req.file.path);
      console.log(`[UPLOAD] URL do arquivo gerada: ${fileUrl}`);

      // Atualizar atividade com URL da evidência
      const updatedActivity = await storage.updateActivity(activityId, {
        evidenceUrl: fileUrl
      });

      console.log(`[UPLOAD] Upload concluído com sucesso para atividade ${activityId}`);

      res.json({
        message: "Arquivo enviado com sucesso",
        file: {
          originalName: req.file.originalname,
          filename: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype,
          url: fileUrl
        },
        activity: updatedActivity
      });

    } catch (error) {
      console.error("Error uploading file:", error);

      // Tentar deletar arquivo em caso de erro
      if (req.file) {
        try {
          await deleteFile(req.file.path);
          console.log(`[UPLOAD] Arquivo deletado após erro: ${req.file.path}`);
        } catch (deleteError) {
          console.error("Error deleting file after upload failure:", deleteError);
        }
      }

      res.status(500).json({
        message: "Erro ao enviar arquivo",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Rota para servir arquivos
  app.get('/api/files/*', isAuthenticated, async (req: any, res) => {
    try {
      const filePath = req.params[0]; // Captura tudo depois de /api/files/
      const fullPath = getFilePath(filePath);

      console.log(`[SERVE] Tentando servir arquivo: ${fullPath}`);

      // Verificar se arquivo existe
      if (!fs.existsSync(fullPath)) {
        console.log(`[SERVE] Arquivo não encontrado: ${fullPath}`);
        return res.status(404).json({ message: "Arquivo não encontrado" });
      }

      // Verificar se usuário tem permissão para acessar o arquivo
      // Extrair activityId do nome do arquivo (formato: activity_ID_timestamp_name.ext)
      const filename = path.basename(fullPath);
      const activityIdMatch = filename.match(/^activity_([^_]+)_/);

      if (activityIdMatch) {
        const activityId = activityIdMatch[1];
        const activity = await storage.getActivity(activityId);

        if (activity) {
          const userId = req.user.id;
          const userRole = req.user.role;
          const userSectorId = req.user.sectorId;

          // Verificar permissão: colaborador da atividade, admin, ou chefe do mesmo setor
          const hasPermission =
            activity.collaboratorId === userId ||
            userRole === 'admin' ||
            (userRole === 'sector_chief' && activity.collaborator?.sectorId === userSectorId);

          if (!hasPermission) {
            console.log(`[SERVE] Acesso negado ao arquivo ${filename} para usuário ${userId}`);
            return res.status(403).json({ message: "Acesso negado ao arquivo" });
          }
        }
      }

      console.log(`[SERVE] Servindo arquivo: ${fullPath}`);
      // Servir arquivo
      res.sendFile(path.resolve(fullPath));

    } catch (error) {
      console.error("Error serving file:", error);
      res.status(500).json({
        message: "Erro ao acessar arquivo",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Rota para deletar evidência
  app.delete('/api/activities/:activityId/evidence', isAuthenticated, async (req: any, res) => {
    try {
      const { activityId } = req.params;
      const userId = req.user.id;

      console.log(`[DELETE] Tentando deletar evidência da atividade ${activityId}`);

      // Verificar se a atividade existe e se o usuário tem permissão
      const activity = await storage.getActivity(activityId);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }

      // Verificar permissão
      if (activity.collaboratorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Deletar arquivo físico se existir
      if (activity.evidenceUrl) {
        try {
          const fullPath = getFilePath(activity.evidenceUrl);
          await deleteFile(fullPath);
          console.log(`[DELETE] Arquivo deletado: ${fullPath}`);
        } catch (deleteError) {
          console.warn("Could not delete file:", deleteError);
          // Não retornar erro, pois o importante é limpar a referência no banco
        }
      }

      // Limpar URL da evidência na atividade
      const updatedActivity = await storage.updateActivity(activityId, {
        evidenceUrl: null
      });

      console.log(`[DELETE] Evidência removida da atividade ${activityId}`);

      res.json({
        message: "Evidência removida com sucesso",
        activity: updatedActivity
      });

    } catch (error) {
      console.error("Error deleting evidence:", error);
      res.status(500).json({
        message: "Erro ao remover evidência",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Dashboard data routes
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;

      // Get today's completed activities
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayActivities = await storage.getCompletedActivitiesForPeriod(userId, today, tomorrow);
      const todayTime = todayActivities.reduce((total, activity) => total + (activity.totalTime || 0), 0);

      // Get this week's completed activities
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());

      const weekActivities = await storage.getCompletedActivitiesForPeriod(userId, weekStart, tomorrow);
      const weekTime = weekActivities.reduce((total, activity) => total + (activity.totalTime || 0), 0);

      res.json({
        todayHours: Math.floor(todayTime / 3600),
        todayMinutes: Math.floor((todayTime % 3600) / 60),
        weekHours: Math.floor(weekTime / 3600),
        weekMinutes: Math.floor((weekTime % 3600) / 60),
        completedToday: todayActivities.length,
        completedWeek: weekActivities.length,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Real-time sector activities for sector chiefs
  app.get('/api/sector/active-activities', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'sector_chief' || !user.sectorId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const activeActivities = await storage.getActiveActivitiesBySector(user.sectorId);
      res.json(activeActivities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active activities" });
    }
  });

  const httpServer = createServer(app);

  // Team management routes for sector chiefs and admins
  app.get('/api/team/members', isAuthenticated, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.user!.id);
      if (!currentUser || (currentUser.role !== 'sector_chief' && currentUser.role !== 'admin')) {
        return res.status(403).json({ message: "Access denied" });
      }

      let members;
      if (currentUser.role === 'admin') {
        // Admins can see all users
        members = await storage.getAllUsers();
      } else if (currentUser.sectorId) {
        // Sector chiefs see their sector
        members = await storage.getUsersBySector(currentUser.sectorId);
      } else {
        return res.status(400).json({ message: "No sector assigned" });
      }

      res.json(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  app.get('/api/team/activities', isAuthenticated, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.user!.id);
      if (!currentUser || (currentUser.role !== 'sector_chief' && currentUser.role !== 'admin')) {
        return res.status(403).json({ message: "Access denied" });
      }

      let activities;
      if (currentUser.role === 'admin') {
        // Admins can see all activities
        activities = await storage.getAllActivities();
      } else if (currentUser.sectorId) {
        // Sector chiefs see their sector
        activities = await storage.getActivitiesBySector(currentUser.sectorId);
      } else {
        return res.status(400).json({ message: "No sector assigned" });
      }

      // Apply time filter if provided
      const timeFilter = req.query.timeFilter;
      if (timeFilter && timeFilter !== 'all') {
        const now = new Date();
        let startDate: Date;

        switch (timeFilter) {
          case 'today':
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 1);
            break;
          default:
            startDate = new Date(0); // No filter
        }

        activities = activities.filter((activity: any) => {
          const activityDate = new Date(activity.createdAt);
          return activityDate >= startDate;
        });
      }

      res.json(activities);
    } catch (error) {
      console.error("Error fetching team activities:", error);
      res.status(500).json({ message: "Failed to fetch team activities" });
    }
  });

  app.get('/api/team/stats', isAuthenticated, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.user!.id);
      if (!currentUser || (currentUser.role !== 'sector_chief' && currentUser.role !== 'admin')) {
        return res.status(403).json({ message: "Access denied" });
      }

      let activities;
      if (currentUser.role === 'admin') {
        // Admins can see all activities
        activities = await storage.getAllActivities();
      } else if (currentUser.sectorId) {
        // Sector chiefs see their sector
        activities = await storage.getActivitiesBySector(currentUser.sectorId);
      } else {
        return res.status(400).json({ message: "No sector assigned" });
      }

      // Apply time filter if provided
      const timeFilter = req.query.timeFilter;
      if (timeFilter && timeFilter !== 'all') {
        const now = new Date();
        let startDate: Date;

        switch (timeFilter) {
          case 'today':
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 1);
            break;
          default:
            startDate = new Date(0); // No filter
        }

        activities = activities.filter((activity: any) => {
          const activityDate = new Date(activity.createdAt);
          return activityDate >= startDate;
        });
      }

      // Calculate stats
      const totalActivities = activities.length;
      const completedActivities = activities.filter((a: any) => a.status === 'completed').length;
      const totalTime = activities.reduce((sum: number, a: any) => sum + (a.totalTime || 0), 0);

      const stats = {
        totalActivities,
        completedActivities,
        totalTime,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching team stats:", error);
      res.status(500).json({ message: "Failed to fetch team stats" });
    }
  });

  // Reports routes
  app.get('/api/reports/filter-options', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let activities;
      if (user.role === 'admin') {
        activities = await storage.getAllActivities();
      } else if (user.role === 'sector_chief' && user.sectorId) {
        activities = await storage.getActivitiesBySector(user.sectorId);
      } else {
        activities = await storage.getActivitiesByCollaborator(userId);
      }

      // Extract unique filter options from actual data
      const plants = await storage.getPlants(); // Get all registered plants instead of just from activities
      const plantNames = plants.map((p: any) => p.name).sort();
      const projects = Array.from(new Set(activities.map((a: any) => a.project).filter(Boolean)));
      const requesters = Array.from(new Set(activities.map((a: any) => a.requester).filter(Boolean)));

      // Get collaborators based on user role
      let collaborators: any[] = [];
      if (user.role === 'admin') {
        collaborators = await storage.getAllUsers();
      } else if (user.role === 'sector_chief' && user.sectorId) {
        collaborators = await storage.getUsersBySector(user.sectorId);
      }

      res.json({
        plants: plantNames,
        projects: projects.sort(),
        requesters: requesters.sort(),
        collaborators: collaborators.map(c => ({ id: c.id, username: c.username })).sort((a, b) => a.username.localeCompare(b.username))
      });
    } catch (error) {
      console.error("Error fetching filter options:", error);
      res.status(500).json({ message: "Failed to fetch filter options" });
    }
  });

  app.get('/api/reports/activities', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const {
        plant,
        project,
        requester,
        collaboratorId,
        startDate,
        endDate,
        status,
        type,
        sectorId
      } = req.query;

      let activities;
      if (user.role === 'admin') {
        activities = await storage.getAllActivities();
      } else if (user.role === 'sector_chief' && user.sectorId) {
        activities = await storage.getActivitiesBySector(user.sectorId);
      } else {
        activities = await storage.getActivitiesByCollaborator(userId);
      }

      // Apply filters
      let filteredActivities = activities.filter((activity: any) => {
        let matches = true;

        if (plant && activity.plant !== plant) matches = false;
        if (project && activity.project !== project) matches = false;
        if (requester && activity.requester !== requester) matches = false;
        if (collaboratorId && activity.collaboratorId !== collaboratorId) matches = false;
        if (type && activity.type !== type) matches = false;
        if (status && activity.status !== status) matches = false;


        // Filter by date range
        if (startDate || endDate) {
          const createdAt = new Date(activity.createdAt);

          // Get date in YYYY-MM-DD format for comparison
          const createdDateStr = createdAt.toISOString().split('T')[0];

          if (startDate) {
            const startDateStr = new Date(startDate as string).toISOString().split('T')[0];
            if (createdDateStr < startDateStr) matches = false;
          }

          if (endDate) {
            const endDateStr = new Date(endDate as string).toISOString().split('T')[0];
            if (createdDateStr > endDateStr) matches = false;
          }
        }

        return matches;
      });


      res.json(filteredActivities);
    } catch (error) {
      console.error("Error fetching report activities:", error);
      res.status(500).json({ message: "Failed to fetch report activities" });
    }
  });

  app.post('/api/reports/export', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const filters = req.body;
      const format = req.query.format as 'csv' | 'excel' | 'pdf' | 'docx';

      let activities;
      if (user.role === 'admin') {
        activities = await storage.getAllActivities();
      } else if (user.role === 'sector_chief' && user.sectorId) {
        activities = await storage.getActivitiesBySector(user.sectorId);
      } else {
        activities = await storage.getActivitiesByCollaborator(userId);
      }

      // Apply same filters as reports/activities endpoint
      let filteredActivities = activities.filter((activity: any) => {
        let matches = true;

        if (filters.plant && activity.plant !== filters.plant) matches = false;
        if (filters.project && activity.project !== filters.project) matches = false;
        if (filters.requester && activity.requester !== filters.requester) matches = false;
        if (filters.collaboratorId && activity.collaboratorId !== filters.collaboratorId) matches = false;
        if (filters.type && activity.type !== filters.type) matches = false;


        if (filters.startDate || filters.endDate) {
          const createdAt = new Date(activity.createdAt);
          if (filters.startDate && createdAt < new Date(filters.startDate)) matches = false;
          if (filters.endDate && createdAt > new Date(filters.endDate + 'T23:59:59')) matches = false;
        }

        return matches;
      });

      // Generate CSV content
      if (format === 'csv') {
        const csvHeaders = [
          'Título', 'Descrição', 'Tipo', 'Status', 'Prioridade',
          'Planta', 'Projeto', 'Solicitante', 'Colaborador',
          'Tempo Total (horas)', 'Data Criação', 'Data Conclusão'
        ];

        const csvRows = filteredActivities.map((activity: any) => [
          activity.title || '',
          activity.description || '',
          activity.type === 'simple' ? 'Simples' : 'Checklist',
          activity.status === 'completed' ? 'Concluída' :
            activity.status === 'in_progress' ? 'Em Andamento' :
              activity.status === 'paused' ? 'Pausada' :
                activity.status === 'cancelled' ? 'Cancelada' : 'Pendente',
          activity.priority === 'high' ? 'Alta' :
            activity.priority === 'medium' ? 'Média' : 'Baixa',
          activity.plant || '',
          activity.project || '',
          activity.requester || '',
          activity.collaborator?.username || '',
          ((activity.totalTime || 0) / (1000 * 60 * 60)).toFixed(2),
          activity.createdAt ? new Date(activity.createdAt).toLocaleDateString('pt-BR') : '',
          activity.completedAt ? new Date(activity.completedAt).toLocaleDateString('pt-BR') : ''
        ]);

        const csvContent = [csvHeaders, ...csvRows]
          .map(row => row.map(field => `"${field}"`).join(','))
          .join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="relatorio.csv"');
        res.send('\ufeff' + csvContent); // UTF-8 BOM for Excel compatibility
      } else if (format === 'excel') {
        // For now, return CSV format for Excel too
        const csvHeaders = [
          'Título', 'Descrição', 'Tipo', 'Status', 'Prioridade',
          'Planta', 'Projeto', 'Solicitante', 'Colaborador',
          'Tempo Total (horas)', 'Data Criação', 'Data Conclusão'
        ];

        const csvRows = filteredActivities.map((activity: any) => [
          activity.title || '',
          activity.description || '',
          activity.type === 'simple' ? 'Simples' : 'Checklist',
          activity.status === 'completed' ? 'Concluída' :
            activity.status === 'in_progress' ? 'Em Andamento' :
              activity.status === 'paused' ? 'Pausada' :
                activity.status === 'cancelled' ? 'Cancelada' : 'Pendente',
          activity.priority === 'high' ? 'Alta' :
            activity.priority === 'medium' ? 'Média' : 'Baixa',
          activity.plant || '',
          activity.project || '',
          activity.requester || '',
          activity.collaborator?.username || '',
          ((activity.totalTime || 0) / (1000 * 60 * 60)).toFixed(2),
          activity.createdAt ? new Date(activity.createdAt).toLocaleDateString('pt-BR') : '',
          activity.completedAt ? new Date(activity.completedAt).toLocaleDateString('pt-BR') : ''
        ]);

        const csvContent = [csvHeaders, ...csvRows]
          .map(row => row.map(field => `"${field}"`).join(','))
          .join('\n');

        res.setHeader('Content-Type', 'application/vnd.ms-excel');
        res.setHeader('Content-Disposition', 'attachment; filename="relatorio.csv"');
        res.send('\ufeff' + csvContent);
      } else if (format === 'docx') {
        // Generate Word document with hierarchical format
        const doc = new Document({
          sections: [{
            children: [
              // Title
              new Paragraph({
                text: "Relatório de Atividades - ActivityPro",
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
              }),

              // Subtitle with date range
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Período: ${filters.startDate ? new Date(filters.startDate).toLocaleDateString('pt-BR') : 'Início'} a ${filters.endDate ? new Date(filters.endDate).toLocaleDateString('pt-BR') : 'Hoje'}`,
                    size: 24,
                    color: "666666",
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 }
              }),

              // Summary stats
              new Paragraph({
                text: "Resumo Executivo",
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 }
              }),

              new Paragraph({
                children: [
                  new TextRun({ text: `Total de Atividades: ${filteredActivities.length}`, break: 1 }),
                  new TextRun({ text: `Concluídas: ${filteredActivities.filter((a: any) => a.status === 'completed').length}`, break: 1 }),
                  new TextRun({ text: `Em Andamento: ${filteredActivities.filter((a: any) => a.status === 'in_progress').length}`, break: 1 }),
                  new TextRun({ text: `Tempo Total: ${Math.round(filteredActivities.reduce((acc: number, a: any) => acc + (a.totalTime || 0), 0) / (1000 * 60 * 60 * 1000) * 1000) / 1000} horas`, break: 1 }),
                ],
                spacing: { after: 400 }
              }),

              // Activities section
              new Paragraph({
                text: "Detalhamento das Atividades",
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 }
              }),

              // Generate hierarchical content for each activity
              ...filteredActivities.slice(0, 50).flatMap((activity: any) => {
                const activityParagraphs: any[] = [];

                // Activity title
                activityParagraphs.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: activity.title || 'Sem título',
                        bold: true,
                        size: 28,
                        color: "1a365d"
                      }),
                    ],
                    spacing: { before: 200, after: 100 }
                  })
                );

                // Activity details
                const details = [];
                if (activity.collaborator?.username) {
                  details.push(`Colaborador: ${activity.collaborator.username}`);
                }
                if (activity.status) {
                  const statusText = activity.status === 'completed' ? 'Concluída' :
                    activity.status === 'in_progress' ? 'Em Andamento' :
                      activity.status === 'paused' ? 'Pausada' :
                        activity.status === 'cancelled' ? 'Cancelada' : 'Pendente';
                  details.push(`Status: ${statusText}`);
                }
                if (activity.totalTime) {
                  details.push(`Tempo: ${((activity.totalTime || 0) / (1000 * 60 * 60)).toFixed(2)}h`);
                }
                if (activity.createdAt) {
                  details.push(`Criada em: ${new Date(activity.createdAt).toLocaleDateString('pt-BR')}`);
                }

                if (details.length > 0) {
                  activityParagraphs.push(
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: details.join(' | '),
                          size: 20,
                          color: "666666"
                        }),
                      ],
                      spacing: { after: 150 }
                    })
                  );
                }

                // Subtasks
                if (activity.subtasks && activity.subtasks.length > 0) {
                  activity.subtasks.forEach((subtask: any) => {
                    activityParagraphs.push(
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: subtask.completed ? `• ✓ ${subtask.title}` : `• ${subtask.title}`,
                            size: 24,
                            color: "000000"
                          }),
                        ],
                        indent: { left: 720 }, // Indent subtasks
                        spacing: { after: 50 }
                      })
                    );
                  });
                } else {
                  // If no subtasks, show a note
                  activityParagraphs.push(
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "• Nenhuma subtarefa definida",
                          size: 24,
                          color: "999999",
                          italics: true
                        }),
                      ],
                      indent: { left: 720 },
                      spacing: { after: 50 }
                    })
                  );
                }

                // Add spacing between activities
                activityParagraphs.push(
                  new Paragraph({
                    text: "",
                    spacing: { after: 300 }
                  })
                );

                return activityParagraphs;
              }),

              // Footer note if more than 50 activities
              ...(filteredActivities.length > 50 ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Nota: Mostrando as primeiras 50 atividades de um total de ${filteredActivities.length} atividades encontradas.`,
                      italics: true,
                      size: 20,
                      color: "666666",
                    }),
                  ],
                  spacing: { before: 400 }
                })
              ] : []),
            ],
          }],
        });

        const buffer = await Packer.toBuffer(doc);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename="relatorio.docx"');
        res.send(buffer);
      } else if (format === 'pdf') {
        // Generate PDF using Puppeteer
        const puppeteer = await import('puppeteer');

        try {
          const browser = await puppeteer.launch({
            headless: true,
            executablePath: '/usr/bin/chromium-browser',
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-accelerated-2d-canvas',
              '--no-first-run',
              '--no-zygote',
              '--single-process',
              '--disable-gpu',
              '--disable-web-security',
              '--disable-features=VizDisplayCompositor'
            ]
          });
          const page = await browser.newPage();

          // Create HTML content for PDF
          const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Relatório de Atividades - ActivityPro</title>
              <style>
                body {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  margin: 0;
                  padding: 20px;
                  color: #333;
                  line-height: 1.4;
                }
                .header {
                  text-align: center;
                  margin-bottom: 30px;
                  border-bottom: 2px solid #8b5cf6;
                  padding-bottom: 20px;
                }
                .header h1 {
                  color: #8b5cf6;
                  margin: 0 0 10px 0;
                  font-size: 28px;
                }
                .header p {
                  color: #666;
                  margin: 0;
                  font-size: 14px;
                }
                .filters {
                  background-color: #f8fafc;
                  padding: 15px;
                  border-radius: 8px;
                  margin-bottom: 20px;
                  border-left: 4px solid #8b5cf6;
                }
                .filters h3 {
                  margin: 0 0 10px 0;
                  color: #8b5cf6;
                  font-size: 16px;
                }
                .filters p {
                  margin: 5px 0;
                  font-size: 12px;
                  color: #666;
                }
                .activity {
                  background-color: #fff;
                  border: 1px solid #e2e8f0;
                  border-left: 4px solid #8b5cf6;
                  border-radius: 8px;
                  margin-bottom: 20px;
                  padding: 20px;
                  break-inside: avoid;
                }
                .activity-header {
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-start;
                  margin-bottom: 15px;
                }
                .activity-title {
                  font-size: 18px;
                  font-weight: bold;
                  color: #1e293b;
                  margin: 0 0 5px 0;
                }
                .activity-description {
                  color: #64748b;
                  margin: 0 0 15px 0;
                  font-size: 14px;
                }
                .badges {
                  display: flex;
                  gap: 8px;
                  flex-wrap: wrap;
                }
                .badge {
                  display: inline-block;
                  padding: 4px 8px;
                  border-radius: 4px;
                  font-size: 12px;
                  font-weight: 500;
                }
                .badge-completed { background-color: #dcfce7; color: #166534; }
                .badge-in-progress { background-color: #dbeafe; color: #1d4ed8; }
                .badge-paused { background-color: #fef3c7; color: #d97706; }
                .badge-cancelled { background-color: #fee2e2; color: #dc2626; }
                .badge-next { background-color: #f1f5f9; color: #475569; }
                .badge-high { background-color: #fee2e2; color: #dc2626; }
                .badge-medium { background-color: #fed7aa; color: #ea580c; }
                .badge-low { background-color: #dcfce7; color: #166534; }
                .activity-details {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                  gap: 15px;
                  margin: 15px 0;
                  font-size: 13px;
                }
                .detail {
                  display: flex;
                  flex-direction: column;
                }
                .detail-label {
                  color: #64748b;
                  font-size: 11px;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  margin-bottom: 4px;
                }
                .detail-value {
                  color: #1e293b;
                  font-weight: 500;
                }
                .subtasks {
                  margin-top: 15px;
                  padding-top: 15px;
                  border-top: 1px solid #e2e8f0;
                }
                .subtasks h4 {
                  margin: 0 0 10px 0;
                  color: #1e293b;
                  font-size: 14px;
                }
                .subtask {
                  display: flex;
                  align-items: center;
                  margin-bottom: 8px;
                  font-size: 13px;
                }
                .subtask-checkbox {
                  width: 16px;
                  height: 16px;
                  margin-right: 8px;
                  border: 1px solid #d1d5db;
                  border-radius: 3px;
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  background-color: #fff;
                }
                .subtask-checkbox.completed {
                  background-color: #8b5cf6;
                  border-color: #8b5cf6;
                }
                .subtask-checkbox.completed::after {
                  content: "✓";
                  color: white;
                  font-size: 11px;
                  font-weight: bold;
                }
                .subtask-text.completed {
                  text-decoration: line-through;
                  color: #9ca3af;
                }
                .summary {
                  background-color: #f8fafc;
                  padding: 20px;
                  border-radius: 8px;
                  margin-top: 30px;
                  border: 1px solid #e2e8f0;
                }
                .summary h3 {
                  margin: 0 0 15px 0;
                  color: #8b5cf6;
                  font-size: 18px;
                }
                .summary-stats {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                  gap: 15px;
                }
                .stat {
                  text-align: center;
                }
                .stat-number {
                  font-size: 24px;
                  font-weight: bold;
                  color: #8b5cf6;
                }
                .stat-label {
                  font-size: 12px;
                  color: #64748b;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                }
                @media print {
                  .activity {
                    page-break-inside: avoid;
                    break-inside: avoid;
                  }
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>ActivityPro - Relatório de Atividades</h1>
                <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                <p>Usuário: ${user.username} | Perfil: ${user.role === 'admin' ? 'Administrador' : user.role === 'sector_chief' ? 'Chefe de Setor' : 'Colaborador'}</p>
              </div>

              ${Object.keys(filters).length > 0 ? `
              <div class="filters">
                <h3>Filtros Aplicados</h3>
                ${filters.plant ? `<p><strong>Planta:</strong> ${filters.plant}</p>` : ''}
                ${filters.project ? `<p><strong>Projeto:</strong> ${filters.project}</p>` : ''}
                ${filters.requester ? `<p><strong>Solicitante:</strong> ${filters.requester}</p>` : ''}
                ${filters.collaboratorId ? `<p><strong>Colaborador Filtrado:</strong> ${activities.find((a: any) => a.collaboratorId === filters.collaboratorId)?.collaborator?.username || 'Desconhecido'}</p>` : ''}
                ${filters.type ? `<p><strong>Tipo:</strong> ${filters.type === 'simple' ? 'Simples' : 'Checklist'}</p>` : ''}
                ${filters.startDate ? `<p><strong>Data Início:</strong> ${new Date(filters.startDate).toLocaleDateString('pt-BR')}</p>` : ''}
                ${filters.endDate ? `<p><strong>Data Fim:</strong> ${new Date(filters.endDate).toLocaleDateString('pt-BR')}</p>` : ''}
                ${filters.showTimeColumn !== false ? '<p><strong>Exibir Tempo:</strong> Sim</p>' : '<p><strong>Exibir Tempo:</strong> Não</p>'}
              </div>
              ` : ''}

              ${filteredActivities.map((activity: any) => `
                <div class="activity">
                  <div class="activity-header">
                    <div>
                      <h2 class="activity-title">${activity.title || 'Sem título'}</h2>
                      ${activity.description ? `<p class="activity-description">${activity.description}</p>` : ''}
                    </div>
                    <div class="badges">
                      <span class="badge badge-${activity.status === 'completed' ? 'completed' :
              activity.status === 'in_progress' ? 'in-progress' :
                activity.status === 'paused' ? 'paused' :
                  activity.status === 'cancelled' ? 'cancelled' : 'next'}">
                        ${activity.status === 'completed' ? 'Concluída' :
              activity.status === 'in_progress' ? 'Em Andamento' :
                activity.status === 'paused' ? 'Pausada' :
                  activity.status === 'cancelled' ? 'Cancelada' : 'Pendente'}
                      </span>
                      <span class="badge badge-${activity.priority === 'high' ? 'high' : activity.priority === 'medium' ? 'medium' : 'low'}">
                        ${activity.priority === 'high' ? 'Alta' : activity.priority === 'medium' ? 'Média' : 'Baixa'}
                      </span>
                    </div>
                  </div>
                  
                  <div class="activity-details">
                    ${activity.plant ? `
                    <div class="detail">
                      <span class="detail-label">Planta</span>
                      <span class="detail-value">${activity.plant}</span>
                    </div>
                    ` : ''}
                    ${activity.project ? `
                    <div class="detail">
                      <span class="detail-label">Projeto</span>
                      <span class="detail-value">${activity.project}</span>
                    </div>
                    ` : ''}
                    ${activity.requester ? `
                    <div class="detail">
                      <span class="detail-label">Solicitante</span>
                      <span class="detail-value">${activity.requester}</span>
                    </div>
                    ` : ''}
                    ${filters.showTimeColumn !== false ? `
                    <div class="detail">
                      <span class="detail-label">Tempo Total</span>
                      <span class="detail-value">${((activity.totalTime || 0) / (1000 * 60 * 60)).toFixed(2)}h</span>
                    </div>
                    ` : ''}
                    <div class="detail">
                      <span class="detail-label">Data Criação</span>
                      <span class="detail-value">${activity.createdAt ? new Date(activity.createdAt).toLocaleDateString('pt-BR') : '-'}</span>
                    </div>
                    ${activity.collaborator ? `
                    <div class="detail">
                      <span class="detail-label">Colaborador</span>
                      <span class="detail-value">${activity.collaborator.username}</span>
                    </div>
                    ` : ''}
                  </div>

                  ${activity.type === 'checklist' && activity.subtasks && activity.subtasks.length > 0 ? `
                  <div class="subtasks">
                    <h4>Subtarefas</h4>
                    ${activity.subtasks.map((subtask: any) => `
                      <div class="subtask">
                        <span class="subtask-checkbox ${subtask.completed ? 'completed' : ''}"></span>
                        <span class="subtask-text ${subtask.completed ? 'completed' : ''}">${subtask.title}</span>
                      </div>
                    `).join('')}
                  </div>
                  ` : ''}
                </div>
              `).join('')}

              <div class="summary">
                <h3>Resumo do Relatório</h3>
                <div class="summary-stats">
                  <div class="stat">
                    <div class="stat-number">${filteredActivities.length}</div>
                    <div class="stat-label">Total de Atividades</div>
                  </div>
                  <div class="stat">
                    <div class="stat-number">${filteredActivities.filter((a: any) => a.status === 'completed').length}</div>
                    <div class="stat-label">Concluídas</div>
                  </div>
                  <div class="stat">
                    <div class="stat-number">${filteredActivities.filter((a: any) => a.status === 'in_progress').length}</div>
                    <div class="stat-label">Em Andamento</div>
                  </div>
                  <div class="stat">
                    <div class="stat-number">${(filteredActivities.reduce((sum: number, a: any) => sum + (a.totalTime || 0), 0) / (1000 * 60 * 60)).toFixed(1)}h</div>
                    <div class="stat-label">Tempo Total</div>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `;

          await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

          const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
              top: '20px',
              right: '20px',
              bottom: '20px',
              left: '20px'
            }
          });

          await browser.close();

          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'attachment; filename="relatorio.pdf"');
          res.send(pdfBuffer);
        } catch (pdfError) {
          console.error("PDF generation error:", pdfError);
          res.status(500).json({ message: "Failed to generate PDF" });
        }
      }
    } catch (error) {
      console.error("Error exporting report:", error);
      res.status(500).json({ message: "Failed to export report" });
    }
  });

  app.patch('/api/subtasks/:id', isAuthenticated, async (req, res) => {
    try {
      const subtaskId = req.params.id;
      const { completed } = req.body;
      const userId = req.user!.id;

      // Get the subtask and verify permissions
      const subtask = await storage.getSubtask(subtaskId);
      if (!subtask) {
        return res.status(404).json({ message: "Subtask not found" });
      }

      const activity = await storage.getActivity(subtask.activityId);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check permissions
      if (user.role === 'collaborator' && activity.collaboratorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (user.role === 'sector_chief' && activity.collaborator.sectorId !== user.sectorId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Update the subtask
      await storage.updateSubtask(subtaskId, { completed });

      const updatedSubtask = await storage.getSubtask(subtaskId);
      res.json(updatedSubtask);
    } catch (error) {
      console.error("Error updating subtask:", error);
      res.status(500).json({ message: "Failed to update subtask" });
    }
  });

  // WebSocket setup for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map<string, WebSocketClient>();

  wss.on('connection', (ws: WebSocketClient, req) => {
    console.log('WebSocket client connected');

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'authenticate' && message.userId) {
          ws.userId = message.userId;
          const user = await storage.getUser(message.userId);
          if (user?.sectorId) {
            ws.sectorId = user.sectorId;
          }
          clients.set(message.userId, ws);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      if (ws.userId) {
        clients.delete(ws.userId);
      }
      console.log('WebSocket client disconnected');
    });
  });

  // Broadcast function for real-time updates
  function broadcastToSector(sectorId: string, message: any) {
    clients.forEach((client) => {
      if (client.sectorId === sectorId && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  // Broadcast to all admins
  function broadcastToAdmins(message: any) {
    clients.forEach(async (client) => {
      if (client.userId && client.readyState === WebSocket.OPEN) {
        try {
          const user = await storage.getUser(client.userId);
          if (user?.role === 'admin') {
            client.send(JSON.stringify(message));
          }
        } catch (error) {
          console.error('Error checking user role for broadcast:', error);
        }
      }
    });
  }

  // Project routes
  app.get('/api/projects', isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      let projects;

      if (user?.role === 'admin') {
        // Admins can see all projects
        projects = await storage.getProjects();
      } else if (user?.role === 'sector_chief') {
        // Sector chiefs can see projects in their sector
        projects = await storage.getProjectsBySector(user.sectorId!);
      } else {
        // Collaborators can see projects they're assigned to or own
        projects = await storage.getProjectsByUser(user!.id);
      }

      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post('/api/projects', isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (user?.role === 'collaborator') {
        return res.status(403).json({ message: "Only sector chiefs and admins can create projects" });
      }

      const projectData = insertProjectSchema.parse({
        ...req.body,
        ownerId: req.user!.id,
        sectorId: user?.sectorId || req.body.sectorId
      });

      const project = await storage.createProject(projectData);

      // Broadcast to sector
      if (user?.sectorId) {
        broadcastToSector(user.sectorId, {
          type: 'project_created',
          data: project
        });
      }

      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.get('/api/projects/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(req.user!.id);
      const project = await storage.getProjectById(id);

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check permissions
      const hasAccess = user?.role === 'admin' ||
        project.ownerId === user?.id ||
        (user?.role === 'sector_chief' && project.sectorId === user.sectorId) ||
        await storage.isProjectMember(id, user!.id);

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.put('/api/projects/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(req.user!.id);
      const project = await storage.getProjectById(id);

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check permissions - only project owner, sector chief, or admin can update
      const canUpdate = user?.role === 'admin' ||
        project.ownerId === user?.id ||
        (user?.role === 'sector_chief' && project.sectorId === user.sectorId);

      if (!canUpdate) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updates = insertProjectSchema.partial().parse(req.body);
      const updatedProject = await storage.updateProject(id, updates);

      // Broadcast to sector
      if (project.sectorId) {
        broadcastToSector(project.sectorId, {
          type: 'project_updated',
          data: updatedProject
        });
      }

      res.json(updatedProject);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete('/api/projects/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(req.user!.id);
      const project = await storage.getProjectById(id);

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check permissions - only project owner or admin can delete
      const canDelete = user?.role === 'admin' || project.ownerId === user?.id;

      if (!canDelete) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteProject(id);

      // Broadcast to sector
      if (project.sectorId) {
        broadcastToSector(project.sectorId, {
          type: 'project_deleted',
          data: { id }
        });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Project member routes
  app.post('/api/projects/:id/members', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(req.user!.id);
      const project = await storage.getProjectById(id);

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check permissions
      const canAddMembers = user?.role === 'admin' ||
        project.ownerId === user?.id ||
        (user?.role === 'sector_chief' && project.sectorId === user.sectorId);

      if (!canAddMembers) {
        return res.status(403).json({ message: "Access denied" });
      }

      const memberData = insertProjectMemberSchema.parse({
        ...req.body,
        projectId: id
      });

      const member = await storage.addProjectMember(memberData);
      res.status(201).json(member);
    } catch (error) {
      console.error("Error adding project member:", error);
      res.status(500).json({ message: "Failed to add project member" });
    }
  });

  app.delete('/api/projects/:projectId/members/:userId', isAuthenticated, async (req, res) => {
    try {
      const { projectId, userId } = req.params;
      const user = await storage.getUser(req.user!.id);
      const project = await storage.getProjectById(projectId);

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check permissions
      const canRemoveMembers = user?.role === 'admin' ||
        project.ownerId === user?.id ||
        (user?.role === 'sector_chief' && project.sectorId === user.sectorId) ||
        userId === user?.id; // Users can remove themselves

      if (!canRemoveMembers) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.removeProjectMember(projectId, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing project member:", error);
      res.status(500).json({ message: "Failed to remove project member" });
    }
  });

  // User settings routes
  app.get('/api/user/settings', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);

      // Only sector chiefs and admins can access settings
      if (!user || (user.role !== 'sector_chief' && user.role !== 'admin')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const settings = await storage.getUserSettings(userId);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching user settings:", error);
      res.status(500).json({ message: "Failed to fetch user settings" });
    }
  });

  app.put('/api/user/settings', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);

      // Only sector chiefs and admins can modify settings
      if (!user || (user.role !== 'sector_chief' && user.role !== 'admin')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { teamNotificationsEnabled } = req.body;

      if (typeof teamNotificationsEnabled !== 'boolean') {
        return res.status(400).json({ message: "Invalid settings data" });
      }

      const settings = await storage.updateUserSettings(userId, {
        teamNotificationsEnabled,
      });

      res.json(settings);
    } catch (error) {
      console.error("Error updating user settings:", error);
      res.status(500).json({ message: "Failed to update user settings" });
    }
  });

  // Make broadcastToSector available globally
  (global as any).broadcastToSector = broadcastToSector;

  return httpServer;
}

// Make broadcastToSector available for use in routes
declare global {
  var broadcastToSector: (sectorId: string, message: any) => void;
}
