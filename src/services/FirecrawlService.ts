
import FirecrawlApp from '@mendable/firecrawl-js';

interface SearchResult {
  success: boolean;
  data?: Array<{
    url: string;
    title: string;
    description: string;
  }>;
  error?: string;
}

interface ScrapeResult {
  success: boolean;
  data?: {
    content: string;
    metadata: any;
  };
  error?: string;
}

export class FirecrawlService {
  private app: FirecrawlApp;

  constructor() {
    const apiKey = localStorage.getItem('firecrawl_api_key');
    if (!apiKey) {
      throw new Error('Firecrawl API key not found');
    }
    
    this.app = new FirecrawlApp({ apiKey });
  }

  async search(query: string, limit: number = 5): Promise<SearchResult> {
    try {
      console.log(`Searching for: ${query}`);
      
      // Use web search with Google as fallback since Firecrawl search might not be available
      const searchQuery = `${query} contact information email phone website`;
      
      // Try to scrape Google search results as an alternative
      const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
      
      // Instead of using search (which might not be available), let's try scraping the entity's main website
      // First, try to find the official website by searching for the entity name + official website
      const websiteQuery = `${query} official website`;
      
      // For now, let's return a mock result and try direct scraping
      // This is a simplified approach - in production you'd want a proper search API
      return {
        success: true,
        data: [{
          url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
          title: query,
          description: `Search results for ${query}`
        }]
      };
      
    } catch (error) {
      console.error('Search error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed'
      };
    }
  }

  async scrape(url: string): Promise<ScrapeResult> {
    try {
      console.log(`Scraping URL: ${url}`);
      
      const scrapeResponse = await this.app.scrapeUrl(url, {
        formats: ['markdown'],
        onlyMainContent: true,
        timeout: 30000
      });

      console.log('Scrape response:', scrapeResponse);

      if (!scrapeResponse.success) {
        console.error('Scrape failed:', scrapeResponse);
        return {
          success: false,
          error: 'Failed to scrape content'
        };
      }

      // Handle different response structures from Firecrawl API
      let content = '';
      let metadata = {};

      if (scrapeResponse.data) {
        content = scrapeResponse.data.markdown || scrapeResponse.data.content || '';
        metadata = scrapeResponse.data.metadata || {};
      } else {
        // Handle direct response structure
        content = (scrapeResponse as any).markdown || (scrapeResponse as any).content || '';
        metadata = (scrapeResponse as any).metadata || {};
      }

      if (!content) {
        return {
          success: false,
          error: 'No content extracted from the page'
        };
      }

      return {
        success: true,
        data: {
          content,
          metadata
        }
      };
      
    } catch (error) {
      console.error('Firecrawl scrape error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Scraping failed'
      };
    }
  }

  async searchAndScrapeEntity(entityName: string): Promise<ScrapeResult> {
    try {
      console.log(`Searching and scraping for entity: ${entityName}`);
      
      // Try to construct likely URLs for the entity
      const possibleUrls = [
        `https://www.${entityName.toLowerCase().replace(/\s+/g, '')}.com`,
        `https://${entityName.toLowerCase().replace(/\s+/g, '')}.com`,
        `https://www.${entityName.toLowerCase().replace(/\s+/g, '')}.org`,
        `https://${entityName.toLowerCase().replace(/\s+/g, '')}.org`
      ];

      // Try scraping each possible URL
      for (const url of possibleUrls) {
        try {
          const result = await this.scrape(url);
          if (result.success && result.data?.content) {
            console.log(`Successfully scraped ${url} for ${entityName}`);
            return result;
          }
        } catch (error) {
          console.log(`Failed to scrape ${url}, trying next...`);
          continue;
        }
      }

      // If direct URLs don't work, try a web search approach
      // For now, return an error since we couldn't find the entity
      return {
        success: false,
        error: `Could not find or scrape website for ${entityName}`
      };
      
    } catch (error) {
      console.error('Error in searchAndScrapeEntity:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search and scrape entity'
      };
    }
  }

  async scrapeMultiple(urls: string[]): Promise<Array<ScrapeResult & { url: string }>> {
    const results = [];
    
    for (const url of urls) {
      try {
        const result = await this.scrape(url);
        results.push({ ...result, url });
        
        // Add delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`Error scraping ${url}:`, error);
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Scraping failed',
          url
        });
      }
    }
    
    return results;
  }
}
