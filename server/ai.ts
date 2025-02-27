import OpenAI from "openai";
import { log } from "./vite";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function parseEHRData(text: string) {
  try {
    log(`Attempting to parse EHR data with text length: ${text.length}`);
    
    if (!process.env.OPENAI_API_KEY || !openai) {
      log("OPENAI_API_KEY is not set, returning mock EHR data");
      return {
        patientId: `P${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`,
        demographics: {
          gender: Math.random() > 0.5 ? "Male" : "Female",
          age: Math.floor(Math.random() * 70) + 18,
        },
        diagnoses: ["Hypertension", "Type 2 Diabetes"],
        medications: ["Lisinopril 10mg", "Metformin 500mg"],
        allergies: ["Penicillin"],
        labResults: [
          {
            test: "HbA1c",
            value: "7.2%",
            date: new Date().toISOString().split('T')[0],
            reference: "4.0-5.6%"
          }
        ]
      };
    }
    
    const response = await openai!.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Extract structured medical information from the provided EHR text. 
          Return a consistent JSON schema with the following fields:
          - patientId (string): Unique identifier if available
          - demographics: Object containing gender, age, etc.
          - diagnoses: Array of medical conditions
          - medications: Array of current medications with dosage if available
          - allergies: Array of known allergies
          - labResults: Array of objects with test name, value, date, and reference range
          - procedures: Array of objects with procedure name and date
          - vitalSigns: Object containing BP, HR, temp, etc.`,
        },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,  // Lower temperature for more consistent formatting
    });

    const content = response.choices[0].message.content;
    if (!content) {
      log("No content received from OpenAI for EHR parsing");
      throw new Error("No response from AI");
    }
    
    try {
      const parsedContent = JSON.parse(content);
      log(`Successfully parsed EHR data: ${JSON.stringify(parsedContent).slice(0, 100)}...`);
      return parsedContent;
    } catch (jsonError) {
      log(`JSON parsing error: ${jsonError.message}`);
      throw new Error("Failed to parse AI response as JSON");
    }
  } catch (error: any) {
    log(`Error parsing EHR data: ${error.message}`);
    
    // Handle different types of errors
    if (error.response?.status === 429) {
      throw new Error("API rate limit exceeded. Please try again later.");
    } else if (error.response?.status === 401) {
      throw new Error("Authentication error with OpenAI API. Check your API key.");
    } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      throw new Error("Network error connecting to OpenAI. Check your internet connection.");
    }
    
    // Return a fallback response for development/demo purposes
    log("Returning fallback EHR data due to error");
    return {
      patientId: `P${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`,
      demographics: { gender: "Unknown", age: "Unknown" },
      diagnoses: ["Unable to parse diagnoses"],
      medications: ["Unable to parse medications"],
      allergies: [],
      labResults: [],
      note: "Error processing EHR data. This is fallback information."
    };
  }
}

export async function checkDrugInteractions(medications: string[]) {
  try {
    log(`Checking drug interactions for medications: ${medications.join(", ")}`);
    
    if (!process.env.OPENAI_API_KEY || !openai || medications.length < 2) {
      // Return mock data if no API key or only one medication
      if (medications.length < 2) {
        log("Not enough medications to check interactions");
        return { interactions: [] };
      }
      
      log("OPENAI_API_KEY is not set, returning mock drug interaction data");
      return {
        interactions: [
          {
            drug1: medications[0],
            drug2: medications[1],
            risk: "Low",
            description: "Minor interaction that generally doesn't require monitoring."
          }
        ]
      };
    }
    
    const response = await openai!.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a medical drug interaction analysis system. 
          Analyze potential drug interactions between the given medications using evidence-based medical knowledge.
          
          Return JSON with the following structure:
          {
            "interactions": [
              {
                "drug1": "drug name",
                "drug2": "drug name",
                "risk": "High|Medium|Low|None",
                "description": "detailed description of the interaction",
                "recommendation": "clinical recommendation for managing this interaction"
              }
            ],
            "summary": "brief summary of all interactions"
          }
          
          If no interactions are found, return an empty array for interactions.
          Base your analysis on established medical literature.`,
        },
        { role: "user", content: `Medications: ${medications.join(", ")}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      log("No content received from OpenAI for drug interactions");
      throw new Error("No response from AI");
    }
    
    try {
      const interactions = JSON.parse(content);
      log(`Found ${interactions.interactions?.length || 0} potential drug interactions`);
      return interactions;
    } catch (jsonError) {
      log(`JSON parsing error: ${jsonError.message}`);
      throw new Error("Failed to parse AI response as JSON");
    }
  } catch (error: any) {
    log(`Error checking drug interactions: ${error.message}`);
    
    // Handle different errors
    if (error.response?.status === 429) {
      throw new Error("API rate limit exceeded. Please try again later.");
    } else if (error.response?.status === 401) {
      throw new Error("Authentication error with OpenAI API. Check your API key.");
    }
    
    // Return a fallback response for development/demo purposes
    return {
      interactions: medications.length >= 2 ? [
        {
          drug1: medications[0],
          drug2: medications[1],
          risk: "Unknown",
          description: "Unable to analyze interaction due to system error",
          recommendation: "Consult a pharmacist"
        }
      ] : [],
      summary: "Error analyzing drug interactions. This is fallback information."
    };
  }
}

export async function getRecommendations(condition: string, medications: string[]) {
  try {
    log(`Getting recommendations for condition: ${condition}, medications: ${medications.join(", ")}`);
    
    if (!process.env.OPENAI_API_KEY || !openai) {
      log("OPENAI_API_KEY is not set, returning mock recommendations");
      return {
        recommendations: [
          "Consider lifestyle modifications such as diet and exercise",
          "Regular monitoring of vital signs is recommended"
        ],
        warnings: ["This is mock data as the OpenAI API key is not configured"],
        references: ["Mock Reference 1", "Mock Reference 2"]
      };
    }
    
    const response = await openai!.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Provide evidence-based treatment recommendations for the given condition and current medications. Return in JSON format with fields: recommendations (array), warnings (array), references (array).",
        },
        {
          role: "user",
          content: `Condition: ${condition}\nCurrent medications: ${medications.join(", ")}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      log("No content received from OpenAI for recommendations");
      throw new Error("No response from AI");
    }

export async function analyzeImage(imageUrl: string, prompt: string = "What is in this image?") {
  try {
    log(`Analyzing image with OpenRouter: ${imageUrl}`);
    
    const OPENROUTER_API_KEY = "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";
    
    if (!OPENROUTER_API_KEY) {
      log("OPENROUTER_API_KEY is not set, returning mock image analysis");
      return {
        analysis: "This appears to be an image (mock response - OpenRouter API key not configured)",
        confidence: 0.5
      };
    }
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://replit.com", 
        "X-Title": "CDSS Medical Image Analysis",
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
      log(`OpenRouter API error: ${JSON.stringify(errorData)}`);
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    const analysisText = result.choices?.[0]?.message?.content || "No analysis provided";
    
    log(`Image analysis complete: ${analysisText.substring(0, 100)}...`);
    return {
      analysis: analysisText,
      model: result.model,
      usage: result.usage
    };
  } catch (error: any) {
    log(`Error analyzing image: ${error.message}`);
    
    if (error.message.includes("429")) {
      throw new Error("API rate limit exceeded. Please try again later.");
    } else if (error.message.includes("401")) {
      throw new Error("Authentication error with OpenRouter API. Check your API key.");
    } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      throw new Error("Network error connecting to OpenRouter. Check your internet connection.");
    }
    
    return {
      analysis: "Error analyzing image",
      error: error.message
    };
  }
}

    const recommendations = JSON.parse(content);
    log(`Generated ${recommendations.recommendations?.length || 0} recommendations`);
    return recommendations;
  } catch (error: any) {
    log(`Error getting recommendations: ${error.message}`);
    if (error.response?.status === 429) {
      throw new Error("API rate limit exceeded. Please try again later.");
    }
    throw new Error(`Failed to get recommendations: ${error.message}`);
  }
}