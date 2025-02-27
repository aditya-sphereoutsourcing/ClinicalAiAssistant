import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function parseEHRData(text: string) {
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

  return JSON.parse(response.choices[0].message.content);
}

export async function checkDrugInteractions(medications: string[]) {
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

  return JSON.parse(response.choices[0].message.content);
}

export async function getRecommendations(condition: string, medications: string[]) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "Provide evidence-based treatment recommendations for the given condition and current medications. Return in JSON format with fields: recommendations (array), warnings (array), references (array).",
      },
      {
        role: "user",
        content: `Condition: ${condition}\nCurrent medications: ${medications.join(
          ", ",
        )}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content);
}
