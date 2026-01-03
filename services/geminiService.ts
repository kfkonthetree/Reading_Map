import { Recommendation, JourneyData, ReadingBook } from "../types";
import { GoogleGenAI, Type } from "@google/genai";

// Safe access to environment variables
const getApiKey = () => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {
    // Ignore error
  }
  return '';
};

// --- Local Fallback Logic (Plan B) ---
const FALLBACK_LOCATIONS = [
  { lat: 39.90, lng: 116.40, name: '中国 · 北京', regionCode: 'beijing', isDomestic: true },
  { lat: 31.23, lng: 121.47, name: '中国 · 上海', regionCode: 'shanghai', isDomestic: true },
  { lat: 51.50, lng: -0.12, name: '英国 · 伦敦', regionCode: 'GBR', isDomestic: false },
  { lat: 48.85, lng: 2.35, name: '法国 · 巴黎', regionCode: 'FRA', isDomestic: false },
  { lat: 35.67, lng: 139.65, name: '日本 · 东京', regionCode: 'JPN', isDomestic: false },
  { lat: 40.71, lng: -74.00, name: '美国 · 纽约', regionCode: 'USA', isDomestic: false },
  { lat: 55.75, lng: 37.61, name: '俄罗斯 · 莫斯科', regionCode: 'RUS', isDomestic: false },
  { lat: -33.86, lng: 151.20, name: '澳大利亚 · 悉尼', regionCode: 'AUS', isDomestic: false },
];

function stringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function generateFallbackJourney(userInput: string): JourneyData {
  console.log("Using Local Fallback Parser for input...");
  const lines = userInput.split('\n').filter(line => line.trim().length > 0);
  
  const books: ReadingBook[] = lines.map((line, index) => {
    // 1. Try to extract title
    const titleMatch = line.match(/《(.*?)》/);
    const title = titleMatch ? titleMatch[1] : line.split(' ')[0].substring(0, 15);
    
    // 2. Try to extract date
    const dateMatch = line.match(/202\d[.\-/]\d{1,2}/);
    const displayDate = dateMatch ? dateMatch[0].replace(/-/g, '.') : '2024.01';
    
    // 3. Assign a deterministic random location
    const locIndex = stringHash(title) % FALLBACK_LOCATIONS.length;
    const location = FALLBACK_LOCATIONS[locIndex];

    return {
      id: `fallback-${index}`,
      title: title || "未知书籍",
      author: "未知作者",
      year: "2024",
      startDate: displayDate.replace(/\./g, '-').padEnd(10, '-01'),
      displayDate: displayDate,
      summary: "API连接受限，已切换至本地解析模式。系统根据书名为您匹配了可能的心灵坐标。",
      oneLiner: "文字是通向世界的地图。",
      location: location
    };
  });

  return {
    summaryComment: "虽然网络连接了我们，但有时信号会迷失方向。这是基于您的输入生成的本地预览地图。由于API访问受限，我们暂时无法获取AI生成的深度解读，但您的阅读足迹依然闪耀。",
    books: books
  };
}

export const getBookRecommendations = async (query: string): Promise<Recommendation[]> => {
    return [];
};

export const generateReadingJourney = async (userInput: string): Promise<JourneyData> => {
  if (!userInput.trim()) return { summaryComment: "", books: [] };

  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("No API Key found. Using fallback.");
    return generateFallbackJourney(userInput);
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userInput,
      config: {
        systemInstruction: `You are a literary geographer. Transform the user's book list into a JSON object for a map application.
        
        Tasks:
        1. Extract book info (title, author, date). Default date: 2024-01-01.
        2. Geolocation: Assign a meaningful location (Lat/Lng) based on book content/setting/author.
        3. Region: 'isDomestic' (true for China), 'regionCode' (Pinyin for China Province, ISO-3 for Country).
        4. Content: 'summary' (30 words), 'oneLiner' (poetic quote).
        5. 'summaryComment': 100-word romantic annual summary in Simplified Chinese.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summaryComment: { type: Type.STRING },
            books: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  author: { type: Type.STRING },
                  year: { type: Type.STRING },
                  startDate: { type: Type.STRING, description: "YYYY-MM-DD" },
                  displayDate: { type: Type.STRING, description: "YYYY.MM" },
                  summary: { type: Type.STRING },
                  oneLiner: { type: Type.STRING },
                  location: {
                    type: Type.OBJECT,
                    properties: {
                       lat: { type: Type.NUMBER },
                       lng: { type: Type.NUMBER },
                       name: { type: Type.STRING },
                       regionCode: { type: Type.STRING },
                       isDomestic: { type: Type.BOOLEAN }
                    },
                    required: ["lat", "lng", "name", "regionCode", "isDomestic"]
                  }
                },
                required: ["title", "author", "startDate", "location", "summary", "oneLiner"]
              }
            }
          },
          required: ["summaryComment", "books"]
        }
      }
    });

    if (response.text) {
       const data = JSON.parse(response.text) as JourneyData;
       // Add IDs
       data.books = data.books.map((b, i) => ({ 
          ...b, 
          id: `gen-${i}-${Date.now()}`
       }));
       return data;
    }
    
    throw new Error("No text response from Gemini");

  } catch (error) {
    // Log as warning to prevent alarming console errors (Failed to fetch) in frontend
    console.warn("Gemini API Call Failed. Switching to Local Parsing.", error);
    return generateFallbackJourney(userInput);
  }
};