import { pgTable, text, serial, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("doctor"),
});

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  dob: text("dob").notNull(),
  medicalHistory: jsonb("medical_history").$type<{
    condition: string;
    diagnosed_at: string;
  }[]>(),
  medications: jsonb("medications").$type<string[]>(),
  ehrData: jsonb("ehr_data").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const drugInteractions = pgTable("drug_interactions", {
  id: serial("id").primaryKey(),
  patientId: serial("patient_id").references(() => patients.id),
  medications: jsonb("medications").$type<string[]>(),
  interactionsDetected: jsonb("interactions_detected").$type<{
    drug1: string;
    drug2: string;
    risk: string;
    description: string;
  }[]>(),
  checkedAt: timestamp("checked_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPatientSchema = createInsertSchema(patients);
export const insertDrugInteractionSchema = createInsertSchema(drugInteractions);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type DrugInteraction = typeof drugInteractions.$inferSelect;
