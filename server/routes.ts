import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { parseEHRData, checkDrugInteractions, getRecommendations } from "./ai";
import multer from "multer";
import { insertPatientSchema } from "@shared/schema";

const upload = multer();

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
        res.status(400).json({ error: error.message });
      }
    },
  );

  app.get("/api/patients", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const patients = await storage.getPatients();
    res.json(patients);
  });

  app.post(
    "/api/drug-interactions",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const { medications, patientId } = req.body;
      const interactions = await checkDrugInteractions(medications);
      const saved = await storage.createDrugInteraction({
        patientId,
        medications,
        interactionsDetected: interactions.interactions,
      });
      res.json(saved);
    },
  );

  app.post(
    "/api/recommendations",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const { condition, medications } = req.body;
      const recommendations = await getRecommendations(condition, medications);
      res.json(recommendations);
    },
  );

  const httpServer = createServer(app);
  return httpServer;
}
