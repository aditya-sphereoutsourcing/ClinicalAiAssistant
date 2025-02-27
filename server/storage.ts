import createMemoryStore from "memorystore";
import session from "express-session";
import { User, Patient, DrugInteraction, InsertUser } from "@shared/schema";
import { db } from "./db";
import { users, patients, drugInteractions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { log } from "./vite";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  sessionStore: session.Store;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getPatients(): Promise<Patient[]>;
  getPatientById(id: number): Promise<Patient | undefined>;
  createPatient(patient: Omit<Patient, "id">): Promise<Patient>;
  createDrugInteraction(interaction: Omit<DrugInteraction, "id">): Promise<DrugInteraction>;
  getPatientDrugInteractions(patientId: number): Promise<DrugInteraction[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private patients: Map<number, Patient>;
  private drugInteractions: Map<number, DrugInteraction>;
  sessionStore: session.Store;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.patients = new Map();
    this.drugInteractions = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    if (db) {
      try {
        const result = await db.select().from(users).where(eq(users.id, id));
        return result[0];
      } catch (error) {
        log(`Database error in getUser: ${error}`);
      }
    }
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (db) {
      try {
        const result = await db.select().from(users).where(eq(users.username, username));
        return result[0];
      } catch (error) {
        log(`Database error in getUserByUsername: ${error}`);
      }
    }
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (db) {
      try {
        const result = await db.insert(users).values({
          ...insertUser,
          role: "doctor"
        }).returning();
        return result[0];
      } catch (error) {
        log(`Database error in createUser: ${error}`);
      }
    }
    
    const id = this.currentId++;
    const user: User = { ...insertUser, id, role: "doctor" };
    this.users.set(id, user);
    return user;
  }

  async getPatients(): Promise<Patient[]> {
    if (db) {
      try {
        return await db.select().from(patients);
      } catch (error) {
        log(`Database error in getPatients: ${error}`);
      }
    }
    return Array.from(this.patients.values());
  }

  async getPatientById(id: number): Promise<Patient | undefined> {
    if (db) {
      try {
        const result = await db.select().from(patients).where(eq(patients.id, id));
        return result[0];
      } catch (error) {
        log(`Database error in getPatientById: ${error}`);
      }
    }
    return this.patients.get(id);
  }

  async createPatient(patient: Omit<Patient, "id">): Promise<Patient> {
    if (db) {
      try {
        const result = await db.insert(patients).values(patient).returning();
        return result[0];
      } catch (error) {
        log(`Database error in createPatient: ${error}`);
      }
    }
    
    const id = this.currentId++;
    const newPatient = { ...patient, id };
    this.patients.set(id, newPatient);
    return newPatient;
  }

  async createDrugInteraction(
    interaction: Omit<DrugInteraction, "id">,
  ): Promise<DrugInteraction> {
    if (db) {
      try {
        const result = await db.insert(drugInteractions).values(interaction).returning();
        return result[0];
      } catch (error) {
        log(`Database error in createDrugInteraction: ${error}`);
      }
    }
    
    const id = this.currentId++;
    const newInteraction = { ...interaction, id };
    this.drugInteractions.set(id, newInteraction);
    return newInteraction;
  }

  async getPatientDrugInteractions(patientId: number): Promise<DrugInteraction[]> {
    if (db) {
      try {
        return await db.select().from(drugInteractions).where(eq(drugInteractions.patientId, patientId));
      } catch (error) {
        log(`Database error in getPatientDrugInteractions: ${error}`);
      }
    }
    
    return Array.from(this.drugInteractions.values())
      .filter(interaction => interaction.patientId === patientId);
  }
}

export const storage = new MemStorage();