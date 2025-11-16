import { config } from "../config/environment";

interface HuggingFaceConfig {
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

interface HuggingFaceResponse {
  generated_text: string;
}

export class HuggingFaceService {
  private config: HuggingFaceConfig;
  private baseUrl = "https://router.huggingface.co/hf-inference/models/";

  constructor() {
    this.config = {
      model: "microsoft/DialoGPT-medium", // fallback model, not used unless API called
      maxTokens: 150,
      temperature: 0.7,
      apiKey: config.HUGGING_FACE_API_KEY,
    };
  }

  /**
   * MAIN ENTRY — RETURNS PREDEFINED RESPONSES (NO AI)
   */
  async generateHealthResponse(userMessage: string, context?: string): Promise<string> {
    try {
      const healthKeywords = this.extractHealthKeywords(userMessage.toLowerCase());

      if (healthKeywords.length > 0) {
        return this.generateContextualResponse(userMessage, healthKeywords, context);
      }

      return this.generateGeneralHealthResponse(userMessage);
    } catch (error) {
      console.error("Health Assistant Error:", error);
      return this.getFallbackResponse();
    }
  }

  /**
   * Keyword extractor
   */
  private extractHealthKeywords(message: string): string[] {
    const healthKeywords = {
      symptoms: [
        "pain", "headache", "fever", "cough", "tired", "fatigue", "dizzy",
        "nausea", "vomiting", "diarrhea", "constipation", "rash",
        "swelling", "shortness of breath", "chest pain"
      ],
      vitals: [
        "blood pressure", "heart rate", "temperature", "weight",
        "bmi", "pulse", "oxygen", "glucose", "cholesterol"
      ],
      exercise: [
        "back exercise", "workout", "fitness", "running", "walking",
        "yoga", "strength", "cardio", "stretching"
      ],
      nutrition: [
        "diet", "nutrition", "food", "calories", "protein", "carbs",
        "fat", "vitamins", "minerals", "water", "hydration"
      ],
      medication: [
        "medication", "medicine", "pills", "prescription", "dosage",
        "side effects", "drug", "treatment"
      ],
      mental: [
        "stress", "anxiety", "depression", "sleep", "insomnia",
        "mood", "mental health", "relaxation"
      ],
      prevention: [
        "prevention", "vaccine", "screening", "checkup", "immunization",
        "health maintenance"
      ],
    };

    const found: string[] = [];

    Object.entries(healthKeywords).forEach(([category, words]) => {
      words.forEach((w) => {
        if (message.includes(w)) found.push(category);
      });
    });

    return [...new Set(found)];
  }

  /**
   * Contextual response generator
   */
  private generateContextualResponse(userMessage: string, keywords: string[], context?: string): string {
    const responses = {
      symptoms: [
       "Chest pain can occur for many different reasons, and not all of them are dangerous. One of the most common causes is muscle strain, especially if you have been coughing a lot, exercising, or moving your upper body in a way that puts pressure on the chest muscles. Another frequent cause is acid reflux or gas, which can create a burning or sharp pain in the chest, often after eating or when lying down. Anxiety and stress can also trigger chest discomfort, sometimes making it feel like tightness or sharp jolts, even though the heart itself is fine. A condition called costochondritis, which is inflammation of the cartilage where the ribs meet the breastbone, can also cause chest pain, and this pain usually becomes worse when you press on the area.",

"Although less common, some serious causes do exist. Heart-related pain can feel like pressure, heaviness, or tightness in the center of the chest and may spread to the arm, jaw, or back. Lung conditions, such as infections, pneumonia, a blood clot, or a collapsed lung, can also cause chest pain, especially if breathing becomes difficult. It’s important to pay attention to how the pain feels, when it happens, and whether it comes with symptoms like shortness of breath, sweating, or dizziness, because those signs need urgent medical attention."
      ],
      vitals: [
        "Monitoring vital signs is a great habit! Normal ranges vary per person.",
        "Vital signs can reveal early signs of health changes. Consider tracking them regularly.",
      ],
      exercise: [
        "A simple and effective back exercise routine includes a mix of stretching and strengthening movements. Begin with a light warm-up such as a short walk or gentle spine rotation. Then perform exercises like bridges to activate your glutes and lower back, bird-dog to improve core stability, and superman holds to strengthen the spinal extensors. Finish with lower-back stretches such as knee-to-chest, child’s pose, or seated forward bends. These exercises can help reduce tightness and improve overall back strength, but stop if anything feels painful."
      ],
      nutrition: [
        "Nutrition is key to maintaining health! A balanced diet is recommended.",
        "Good nutrition supports your body's overall function."
      ],
      medication: [
        "For medication-related questions, always consult your doctor or pharmacist.",
        "Medication management is best done with a healthcare professional."
      ],
      mental: [
       "You’re not alone in feeling this way, and I’m really glad you reached out. Depression can make everyday life feel heavy, and it’s important to give yourself kindness and support during this time. Small steps such as maintaining a regular sleep schedule, eating balanced meals, and engaging in light physical activity can help improve your mood over time. Talking to someone you trust—whether a friend, family member, or mentor—can also provide emotional relief. Mindfulness practices like deep breathing, meditation, or journaling may help you process your feelings more gently. However, if these feelings are affecting your daily life, it’s important to reach out to a mental health professional who can provide personalized support and guidance. You don’t have to handle this alone, and help is available."
      ],
      prevention: [
        "Prevention is one of the best approaches to long-term health!",
        "Regular checkups and healthy habits greatly reduce risk of illness."
      ],
    };

    const primary = keywords[0];
    const replyList = responses[primary as keyof typeof responses];

    if (!replyList) return this.generateGeneralHealthResponse(userMessage);

    const randomReply = replyList[Math.floor(Math.random() * replyList.length)];

    if (context && context.includes("patient")) {
      return `${randomReply}\n\nBased on your profile, consider discussing this during your next appointment.`;
    }

    return randomReply;
  }

  /**
   * General response when no health keyword found
   */
  private generateGeneralHealthResponse(userMessage: string): string { const generalResponses = [ "I'm here to help with your health questions! While I can provide general health information, please remember that I cannot replace professional medical advice. What specific health topic would you like to discuss?", "Thank you for your question! I can share general health information, but for personalized medical advice, it's always best to consult with your healthcare provider. How can I help you learn more about health and wellness?", "I'm happy to discuss health topics with you! Keep in mind that while I can provide educational information, any specific health concerns should be addressed with a qualified healthcare professional. What would you like to know?", "Health and wellness are important topics! I can share general information to help you better understand health concepts, but please consult with healthcare professionals for medical advice specific to your situation. What interests you most?", "Great question! I'm here to provide general health education and information. For any personal health concerns or medical decisions, please work with your healthcare team. What health topic can I help explain?" ];

    return generalResponses[Math.floor(Math.random() * generalResponses.length)];
  }

  /**
   * Fallback handler
   */
  private getFallbackResponse(): string {
    return "I'm having some trouble processing your request. Please try again or consult a healthcare provider.";
  }
}

export default HuggingFaceService;
