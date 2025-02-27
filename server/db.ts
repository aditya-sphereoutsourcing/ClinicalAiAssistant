
import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from '@neondatabase/serverless';
import { users, patients, drugInteractions } from "@shared/schema";
import { log } from "./vite";
import bcrypt from "bcrypt";

// Check for the database URL
const databaseUrl = process.env.DATABASE_URL;

export const db = databaseUrl 
  ? drizzle(neon(databaseUrl))
  : null;

// Function to load dummy data if no database is available
export async function loadDummyData() {
  try {
    if (db) {
      log("Real database connection available, skipping dummy data");
      return;
    }
    
    log("No database connection available, loading dummy data");
    
    // Create a dummy user
    const hashedPassword = await bcrypt.hash("password123", 10);
    storage.createUser({
      username: "doctor",
      password: hashedPassword,
    });
    
    // Create dummy patient data
    const conditions = [
      "Hypertension", "Diabetes Type 2", "Asthma", "Arthritis", 
      "Depression", "Anxiety", "COPD", "Heart Disease", "Migraine"
    ];
    
    const medications = [
      "Lisinopril", "Metformin", "Albuterol", "Ibuprofen", 
      "Sertraline", "Alprazolam", "Ventolin", "Atorvastatin", "Sumatriptan",
      "Amlodipine", "Levothyroxine", "Omeprazole", "Losartan", "Gabapentin"
    ];
    
    // Generate 50 dummy patients
    for (let i = 1; i <= 50; i++) {
      const randomYear = Math.floor(Math.random() * 60) + 1940;
      const randomMonth = Math.floor(Math.random() * 12) + 1;
      const randomDay = Math.floor(Math.random() * 28) + 1;
      const dob = `${randomYear}-${randomMonth.toString().padStart(2, '0')}-${randomDay.toString().padStart(2, '0')}`;
      
      // Random medical history
      const medicalHistoryCount = Math.floor(Math.random() * 3) + 1;
      const medicalHistory = Array.from({ length: medicalHistoryCount }, () => {
        const condition = conditions[Math.floor(Math.random() * conditions.length)];
        const diagYear = Math.floor(Math.random() * 10) + 2010;
        const diagMonth = Math.floor(Math.random() * 12) + 1;
        const diagDay = Math.floor(Math.random() * 28) + 1;
        return {
          condition,
          diagnosed_at: `${diagYear}-${diagMonth.toString().padStart(2, '0')}-${diagDay.toString().padStart(2, '0')}`
        };
      });
      
      // Random medications
      const medicationCount = Math.floor(Math.random() * 4) + 1;
      const patientMedications = Array.from({ length: medicationCount }, () => 
        medications[Math.floor(Math.random() * medications.length)]
      );
      
      // Create dummy EHR data
      const ehrData = {
        patientId: `P${i.toString().padStart(5, '0')}`,
        demographics: {
          gender: Math.random() > 0.5 ? "Male" : "Female",
          age: 2023 - randomYear,
        },
        vitalSigns: {
          bloodPressure: `${Math.floor(Math.random() * 40) + 100}/${Math.floor(Math.random() * 20) + 60}`,
          heartRate: Math.floor(Math.random() * 30) + 60,
          temperature: (Math.random() * 1 + 36.1).toFixed(1),
        },
        diagnoses: medicalHistory.map(m => m.condition),
        medications: patientMedications,
        allergies: Math.random() > 0.7 ? ["Penicillin"] : [],
        labResults: [
          {
            test: "Complete Blood Count",
            date: `${2023}-${Math.floor(Math.random() * 12) + 1}-${Math.floor(Math.random() * 28) + 1}`,
            result: "Normal"
          }
        ]
      };
      
      await storage.createPatient({
        name: `Patient ${i}`,
        dob,
        medicalHistory,
        medications: patientMedications,
        ehrData,
        createdAt: new Date()
      });
    }
    
    log("Successfully loaded 50 dummy patient records");
  } catch (error) {
    log(`Error loading dummy data: ${error instanceof Error ? error.message : String(error)}`);
  }
}
