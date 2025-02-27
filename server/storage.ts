import { IStorage } from "./storage";
import createMemoryStore from "memorystore";
import session from "express-session";
import { User, Patient, DrugInteraction, InsertUser } from "@shared/schema";

const MemoryStore = createMemoryStore(session);

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
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getPatients(): Promise<Patient[]> {
    return Array.from(this.patients.values());
  }

  async createPatient(patient: Omit<Patient, "id">): Promise<Patient> {
    const id = this.currentId++;
    const newPatient = { ...patient, id };
    this.patients.set(id, newPatient);
    return newPatient;
  }

  async createDrugInteraction(
    interaction: Omit<DrugInteraction, "id">,
  ): Promise<DrugInteraction> {
    const id = this.currentId++;
    const newInteraction = { ...interaction, id };
    this.drugInteractions.set(id, newInteraction);
    return newInteraction;
  }
}

export const storage = new MemStorage();
