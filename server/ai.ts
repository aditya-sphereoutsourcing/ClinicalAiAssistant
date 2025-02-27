import OpenAI from "openai";
import { log } from "./vite";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function parseEHRData(text: string) {
  try {
    log(`Attempting to parse EHR data with text length: ${text.length}`);
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Extract structured medical information from the EHR text. Include diagnoses, medications, and key dates in JSON format.",
        },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      log("No content received from OpenAI for EHR parsing");
      throw new Error("No response from AI");
    }
    const parsedContent = JSON.parse(content);
    log(`Successfully parsed EHR data: ${JSON.stringify(parsedContent).slice(0, 100)}...`);
    return parsedContent;
  } catch (error: any) {
    log(`Error parsing EHR data: ${error.message}`);
    if (error.response?.status === 429) {
      throw new Error("API rate limit exceeded. Please try again later.");
    }
    throw new Error(`Failed to parse EHR data: ${error.message}`);
  }
}

export async function checkDrugInteractions(medications: string[]) {
  try {
    log(`Checking drug interactions for medications: ${medications.join(", ")}`);
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Analyze potential drug interactions between the given medications. Return in JSON format with fields: interactions (array of {drug1, drug2, risk, description}).",
        },
        { role: "user", content: `Medications: ${medications.join(", ")}` },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      log("No content received from OpenAI for drug interactions");
      throw new Error("No response from AI");
    }
    const interactions = JSON.parse(content);
    log(`Found ${interactions.interactions?.length || 0} potential drug interactions`);
    return interactions;
  } catch (error: any) {
    log(`Error checking drug interactions: ${error.message}`);
    if (error.response?.status === 429) {
      throw new Error("API rate limit exceeded. Please try again later.");
    }
    throw new Error(`Failed to check drug interactions: ${error.message}`);
  }
}

export async function getRecommendations(condition: string, medications: string[]) {
  try {
    log(`Getting recommendations for condition: ${condition}, medications: ${medications.join(", ")}`);
    const response = await openai.chat.completions.create({
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