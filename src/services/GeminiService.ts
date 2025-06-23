
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SpreadsheetRow } from '@/pages/Index';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      throw new Error('Gemini API key not found');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async extractContactInfo(webContent: string, entityName: string): Promise<Partial<SpreadsheetRow>> {
    try {
      console.log(`Extracting contact info for ${entityName} from ${webContent.length} characters of content`);
      
      const prompt = `
You are a data extraction AI. Extract contact information for "${entityName}" from the following web content.

Web Content:
${webContent.substring(0, 10000)}

Extract the following information and return it as a JSON object:
{
  "contact": "main contact phone number",
  "phone": "primary phone number", 
  "email": "official email address",
  "website": "official website URL",
  "location": "city, country or full address",
  "linkedin": "LinkedIn profile URL",
  "address": "physical address if available"
}

IMPORTANT RULES:
1. Only extract information that is clearly associated with "${entityName}"
2. For phone numbers, look for main/general contact numbers, support numbers, or office numbers
3. For emails, prefer info@, contact@, hello@, or general inquiry emails
4. For website, use the main domain URL
5. For location, provide city and country at minimum
6. If information is not clearly found, use empty string ""
7. Ensure all URLs are complete and valid (include https://)
8. Format phone numbers in international format if possible
9. Return ONLY the JSON object, no additional text or explanation

JSON:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log(`Gemini response for ${entityName}:`, text);

      try {
        // Extract JSON from the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extractedData = JSON.parse(jsonMatch[0]);
          
          // Clean and validate the data
          const cleanedData: Partial<SpreadsheetRow> = {};
          
          Object.entries(extractedData).forEach(([key, value]) => {
            if (typeof value === 'string' && value.trim() !== '' && value.toLowerCase() !== 'not found') {
              cleanedData[key] = value.trim();
            }
          });
          
          console.log(`Cleaned extracted data for ${entityName}:`, cleanedData);
          return cleanedData;
        } else {
          console.log(`No JSON found in Gemini response for ${entityName}`);
        }
      } catch (parseError) {
        console.error(`Failed to parse Gemini JSON response for ${entityName}:`, parseError);
      }
      
      return {};
      
    } catch (error) {
      console.error(`Gemini API error for ${entityName}:`, error);
      throw new Error(`Failed to extract data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async analyzeSpreadsheetStructure(sampleRows: SpreadsheetRow[]): Promise<{
    nameColumn: string;
    existingColumns: string[];
    suggestedColumns: string[];
  }> {
    try {
      const columns = Object.keys(sampleRows[0] || {});
      const sampleData = sampleRows.slice(0, 3);
      
      const prompt = `
Analyze this spreadsheet structure and identify:
1. Which column contains entity names (companies, organizations, etc.)
2. Which columns already exist
3. Which new columns should be added for contact information

Sample data:
${JSON.stringify(sampleData, null, 2)}

Available columns: ${columns.join(', ')}

Return a JSON object with:
{
  "nameColumn": "column name that contains entity names",
  "existingColumns": ["list", "of", "existing", "columns"],
  "suggestedColumns": ["contact", "email", "website", "location", "linkedin"]
}

JSON:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      try {
        const jsonMatch = text.match(/\{.*\}/s);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.error('Failed to parse structure analysis:', parseError);
      }
      
      // Fallback logic
      const nameColumn = columns.find(col => 
        col.toLowerCase().includes('name') || 
        col.toLowerCase().includes('company') ||
        col.toLowerCase().includes('organization')
      ) || columns[0];
      
      return {
        nameColumn,
        existingColumns: columns,
        suggestedColumns: ['contact', 'email', 'website', 'location', 'linkedin']
      };
      
    } catch (error) {
      console.error('Structure analysis error:', error);
      throw error;
    }
  }
}
