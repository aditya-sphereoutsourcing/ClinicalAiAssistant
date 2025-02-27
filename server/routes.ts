import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { parseEHRData, checkDrugInteractions, getRecommendations } from "./ai";
import multer from "multer";
import { insertPatientSchema, type DrugInteraction } from "@shared/schema";
import { z } from "zod";

const upload = multer();

const drugInteractionSchema = z.object({
  medications: z.array(z.string()),
  patientId: z.number().optional(),
});

const recommendationSchema = z.object({
  condition: z.string(),
  medications: z.array(z.string()),
});

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  app.post(
    "/api/patients",
    upload.single("ehrFile"),
    async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated()) return res.sendStatus(401);

        const fileContent = req.file?.buffer.toString();
        if (!fileContent) {
          return res.status(400).json({ error: "No EHR file provided" });
        }

        const ehrData = await parseEHRData(fileContent);
        const patientData = insertPatientSchema.parse({
          ...req.body,
          ehrData,
        });

        const patient = await storage.createPatient(patientData);
        res.status(201).json(patient);
      } catch (error) {
        if (error instanceof Error) {
          res.status(400).json({ error: error.message });
        } else {
          res.status(500).json({ error: "An unexpected error occurred" });
        }
      }
    },
  );

  app.get("/api/patients", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const patients = await storage.getPatients();
      res.json(patients);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "An unexpected error occurred" });
      }
    }
  });

  app.post(
    "/api/drug-interactions",
    async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated()) return res.sendStatus(401);

        const { medications, patientId } = drugInteractionSchema.parse(req.body);
        const interactions = await checkDrugInteractions(medications);

        const interactionData: Omit<DrugInteraction, "id"> = {
          patientId: patientId || 0,
          medications,
          interactionsDetected: interactions.interactions,
          checkedAt: new Date(),
        };

        const saved = await storage.createDrugInteraction(interactionData);
        res.json(saved);
      } catch (error) {
        if (error instanceof Error) {
          res.status(400).json({ error: error.message });
        } else {
          res.status(500).json({ error: "An unexpected error occurred" });
        }
      }
    },
  );

  app.post(
    "/api/recommendations",
    async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated()) return res.sendStatus(401);

        const { condition, medications } = recommendationSchema.parse(req.body);
        const recommendations = await getRecommendations(condition, medications);
        res.json(recommendations);
      } catch (error) {
        if (error instanceof Error) {
          res.status(400).json({ error: error.message });
        } else {
          res.status(500).json({ error: "An unexpected error occurred" });
        }
      }
    },
  );

  const httpServer = createServer(app);
  return httpServer;
}