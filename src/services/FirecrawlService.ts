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
    const apiKey = import.meta.env.VITE_FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error('Firecrawl API key not found');
    }
    
    this.app = new FirecrawlApp({
      apiKey: import.meta.env.VITE_FIRECRAWL_API_KEY
    });

  }

  async search(query: string, limit: number = 5): Promise<SearchResult> {
    try {
      console.log(`Searching for: ${query}`);
      
      const searchQuery = `${query} contact information email phone website`;
      
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
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        timeout: 45000,
        waitFor: 3000
      });

      console.log('Scrape response:', scrapeResponse);

      if (!scrapeResponse.success) {
        console.error('Scrape failed:', scrapeResponse);
        return {
          success: false,
          error: 'Failed to scrape content'
        };
      }

      let content = '';
      let metadata = {};

      if (scrapeResponse.markdown) {
        content = scrapeResponse.markdown;
      } else if (scrapeResponse.html) {
        content = scrapeResponse.html;
      }

      if (scrapeResponse.metadata) {
        metadata = scrapeResponse.metadata;
      }

      if (!content || content.trim().length < 100) {
        return {
          success: false,
          error: 'Insufficient content extracted from the page'
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

  async findEntityWebsite(entityName: string): Promise<string | null> {
    try {
      console.log(`Finding website for entity: ${entityName}`);
      
      const cleanEntityName = entityName.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '');
      
      const possibleUrls = [
        `https://www.${cleanEntityName}.com`,
        `https://${cleanEntityName}.com`,
        `https://www.${cleanEntityName}.org`,
        `https://${cleanEntityName}.org`,
        `https://www.${cleanEntityName}.net`,
        `https://${cleanEntityName}.net`,
        `https://www.${cleanEntityName}.in`,
        `https://${cleanEntityName}.in`,
        `https://www.${cleanEntityName}.co`,
        `https://${cleanEntityName}.co`
      ];

      for (const url of possibleUrls) {
        try {
          console.log(`Testing URL: ${url}`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const response = await fetch(url, { 
            method: 'HEAD', 
            mode: 'no-cors',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          console.log(`URL ${url} appears to be accessible`);
          return url;
        } catch (error) {
          console.log(`URL ${url} is not accessible, trying next...`);
          continue;
        }
      }

      console.log(`Could not find website for ${entityName}`);
      return null;
      
    } catch (error) {
      console.error('Error in findEntityWebsite:', error);
      return null;
    }
  }

  async searchAndScrapeEntity(entityName: string): Promise<ScrapeResult> {
    try {
      console.log(`Searching and scraping for entity: ${entityName}`);
      
      const websiteUrl = await this.findEntityWebsite(entityName);
      
      if (websiteUrl) {
        console.log(`Found potential website for ${entityName}: ${websiteUrl}`);
        const result = await this.scrape(websiteUrl);
        if (result.success && result.data?.content) {
          console.log(`Successfully scraped ${websiteUrl} for ${entityName}`);
          return result;
        }
      }

      const alternativeUrls = [
        `https://www.crunchbase.com/organization/${entityName.toLowerCase().replace(/\s+/g, '-')}`,
        `https://www.linkedin.com/company/${entityName.toLowerCase().replace(/\s+/g, '-')}`,
        `https://en.wikipedia.org/wiki/${entityName.replace(/\s+/g, '_')}`
      ];

      for (const altUrl of alternativeUrls) {
        try {
          console.log(`Trying alternative source: ${altUrl}`);
          const result = await this.scrape(altUrl);
          if (result.success && result.data?.content) {
            console.log(`Successfully scraped alternative source for ${entityName}`);
            return result;
          }
        } catch (error) {
          console.log(`Alternative source failed: ${altUrl}`);
          continue;
        }
      }

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
