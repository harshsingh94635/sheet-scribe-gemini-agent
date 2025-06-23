
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
      
      // Use Firecrawl's search functionality
      const searchResponse = await this.app.search(query, {
        limit,
        searchOptions: {
          country: 'US',
          language: 'en'
        }
      });

      if (!searchResponse.success) {
        console.error('Search failed:', searchResponse);
        return {
          success: false,
          error: 'Search failed'
        };
      }

      return {
        success: true,
        data: searchResponse.data.map((result: any) => ({
          url: result.url,
          title: result.title || '',
          description: result.description || ''
        }))
      };
      
    } catch (error) {
      console.error('Firecrawl search error:', error);
      return {
        success: false,
        error: error.message || 'Search failed'
      };
    }
  }

  async scrape(url: string): Promise<ScrapeResult> {
    try {
      console.log(`Scraping URL: ${url}`);
      
      const scrapeResponse = await this.app.scrapeUrl(url, {
        formats: ['markdown'],
        waitFor: 1000,
        timeout: 15000
      });

      if (!scrapeResponse.success) {
        console.error('Scrape failed:', scrapeResponse);
        return {
          success: false,
          error: 'Failed to scrape content'
        };
      }

      return {
        success: true,
        data: {
          content: scrapeResponse.data.markdown || scrapeResponse.data.content || '',
          metadata: scrapeResponse.data.metadata || {}
        }
      };
      
    } catch (error) {
      console.error('Firecrawl scrape error:', error);
      return {
        success: false,
        error: error.message || 'Scraping failed'
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
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error scraping ${url}:`, error);
        results.push({
          success: false,
          error: error.message || 'Scraping failed',
          url
        });
      }
    }
    
    return results;
  }
}
