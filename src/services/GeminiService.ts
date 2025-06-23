
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
      const prompt = `
You are a data extraction AI. Extract contact information for "${entityName}" from the following web content.

Web Content:
${webContent.substring(0, 8000)} // Limit content to avoid token limits

Please extract the following information and return it as a JSON object:
{
  "contact": "main contact number (phone)",
  "phone": "primary phone number", 
  "email": "official email address",
  "website": "official website URL",
  "location": "city, country or full address",
  "linkedin": "LinkedIn profile URL",
  "address": "physical address if available"
}

Rules:
1. Only extract information that is clearly associated with "${entityName}"
2. For phone numbers, prefer main/general contact numbers
3. For emails, prefer info@, contact@, or general inquiry emails
4. For location, provide city and country at minimum
5. If information is not found, use empty string ""
6. Ensure all URLs are complete and valid
7. Format phone numbers consistently
8. Return only the JSON object, no additional text

JSON:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('Gemini response:', text);

      // Try to parse the JSON response
      try {
        const jsonMatch = text.match(/\{.*\}/s);
        if (jsonMatch) {
          const extractedData = JSON.parse(jsonMatch[0]);
          
          // Clean and validate the data
          const cleanedData: Partial<SpreadsheetRow> = {};
          
          Object.entries(extractedData).forEach(([key, value]) => {
            if (typeof value === 'string' && value.trim() !== '') {
              cleanedData[key] = value.trim();
            }
          });
          
          return cleanedData;
        }
      } catch (parseError) {
        console.error('Failed to parse Gemini JSON response:', parseError);
      }
      
      return {};
      
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Failed to extract data: ${error.message}`);
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
