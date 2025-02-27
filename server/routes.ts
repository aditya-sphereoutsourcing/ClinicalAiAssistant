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

async function analyzeImage(imageUrl: string, prompt: string): Promise<any> {
  const apiKey = "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"; // Replace with your actual API key
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "YOUR_SITE_URL", // Replace with your site URL
      "X-Title": "YOUR_SITE_NAME", // Replace with your site title
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "model": "qwen/qwen2.5-vl-72b-instruct:free",
      "messages": [
        {
          "role": "user",
          "content": [
            {
              "type": "text",
              "text": prompt
            },
            {
              "type": "image_url",
              "image_url": {
                "url": imageUrl
              }
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OpenRouter API request failed with status ${response.status}: ${JSON.stringify(errorData)}`);
  }

  return await response.json();
}


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

  app.get("/api/patients/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const patientId = parseInt(req.params.id);
      if (isNaN(patientId)) {
        return res.status(400).json({ error: "Invalid patient ID" });
      }

      const patient = await storage.getPatientById(patientId);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      res.json(patient);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "An unexpected error occurred" });
      }
    }
  });

  app.get("/api/patients/:id/history", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const patientId = parseInt(req.params.id);
      if (isNaN(patientId)) {
        return res.status(400).json({ error: "Invalid patient ID" });
      }

      const patient = await storage.getPatientById(patientId);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      // Get drug interactions history
      const interactions = await storage.getPatientDrugInteractions(patientId);

      // Compile comprehensive patient history
      const history = {
        patientInfo: {
          id: patient.id,
          name: patient.name,
          dob: patient.dob,
        },
        medicalHistory: patient.medicalHistory || [],
        currentMedications: patient.medications || [],
        ehrData: patient.ehrData || {},
        drugInteractionHistory: interactions.map(item => ({
          id: item.id,
          medications: item.medications,
          interactionsDetected: item.interactionsDetected,
          checkedAt: item.checkedAt,
        })),
      };

      res.json(history);
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

  // Image analysis endpoint
  app.post('/api/analyze-image', async (req: Request, res: Response) => {
    const { imageUrl, prompt } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    try {
      const analysis = await analyzeImage(imageUrl, prompt || "What is in this image? Provide clinical analysis if it appears to be a medical image.");
      return res.json(analysis);
    } catch (error: any) {
      console.error('Error analyzing image:', error);
      return res.status(400).json({ error: error.message });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}