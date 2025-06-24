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
You are an expert data extraction AI specializing in finding contact information for businesses and organizations.

Extract contact information for "${entityName}" from the following web content:

${webContent.substring(0, 15000)}

Return ONLY a valid JSON object with the following structure:
{
  "contact": "main contact phone number with country code",
  "phone": "primary phone number with country code", 
  "email": "official email address (prefer contact@, info@, hello@, or general inquiry emails)",
  "website": "official website URL (must include https://)",
  "location": "city, state/province, country",
  "linkedin": "LinkedIn company profile URL (must be company page, not personal)",
  "address": "complete physical address if available",
  "twitter": "Twitter/X handle or URL if found",
  "facebook": "Facebook page URL if found"
}

CRITICAL EXTRACTION RULES:
1. Phone numbers: Look for main office, customer service, or general contact numbers. Include country code if available.
2. Email addresses: Prioritize general contact emails like info@, contact@, hello@, support@, admin@ over personal emails
3. Website: Use the main official domain URL, ensure it starts with https://
4. Location: Extract city, state/country. Look for "headquarters", "office location", "based in"
5. LinkedIn: Only extract official company LinkedIn pages (linkedin.com/company/), not personal profiles
6. Address: Look for complete mailing addresses, office addresses, or headquarters locations
7. Social media: Extract official business accounts only

IMPORTANT:
- If information is not clearly found or doesn't belong to "${entityName}", use empty string ""
- All URLs must be complete and valid (include https://)
- Phone numbers should include country code when possible (+1 for US, +91 for India, etc.)
- Ensure extracted data specifically relates to "${entityName}" and not other companies mentioned
- Return ONLY the JSON object, no additional text, explanations, or formatting

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
          
          // Clean and validate the data more thoroughly
          const cleanedData: Partial<SpreadsheetRow> = {};
          
          Object.entries(extractedData).forEach(([key, value]) => {
            if (typeof value === 'string' && value.trim() !== '' && 
                value.toLowerCase() !== 'not found' && 
                value.toLowerCase() !== 'n/a' &&
                value.toLowerCase() !== 'not available' &&
                value !== '""' &&
                value !== "''" &&
                !value.toLowerCase().includes('not specified')) {
              
              let cleanedValue = value.trim();
              
              // Specific cleaning for different field types
              if (key === 'website' && !cleanedValue.startsWith('http')) {
                cleanedValue = 'https://' + cleanedValue;
              }
              
              if (key === 'email' && !cleanedValue.includes('@')) {
                return; // Skip invalid emails
              }
              
              if ((key === 'linkedin' || key === 'twitter' || key === 'facebook') && 
                  !cleanedValue.startsWith('http')) {
                return; // Skip invalid social media URLs
              }
              
              cleanedData[key] = cleanedValue;
            }
          });
          
          console.log(`Cleaned extracted data for ${entityName}:`, cleanedData);
          return cleanedData;
        } else {
          console.log(`No JSON found in Gemini response for ${entityName}`);
        }
      } catch (parseError) {
        console.error(`Failed to parse Gemini JSON response for ${entityName}:`, parseError);
        console.log('Raw response:', text);
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
  "suggestedColumns": ["contact", "phone", "email", "website", "location", "linkedin", "address", "twitter", "facebook"]
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
        col.toLowerCase().includes('organization') ||
        col.toLowerCase().includes('incubator')
      ) || columns[0];
      
      return {
        nameColumn,
        existingColumns: columns,
        suggestedColumns: ['contact', 'phone', 'email', 'website', 'location', 'linkedin', 'address', 'twitter', 'facebook']
      };
      
    } catch (error) {
      console.error('Structure analysis error:', error);
      throw error;
    }
  }
}
