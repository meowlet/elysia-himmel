/**
 * Interface for content filtering strategies
 * All concrete strategies must implement this interface
 */
export interface ContentFilterStrategy {
  /**
   * Filter the provided content according to the strategy
   * @param content The content to filter
   * @returns The filtered content
   */
  filter(content: string): string;

  /**
   * Check if the content is appropriate according to this strategy
   * @param content The content to check
   * @returns True if the content is appropriate, false otherwise
   */
  isAppropriate(content: string): boolean;

  /**
   * Get the name of this strategy
   * @returns The strategy name
   */
  getName(): string;
}

/**
 * Strategy for filtering profanity in content
 */
export class ProfanityFilterStrategy implements ContentFilterStrategy {
  // Simple list of profane words to filter
  private profaneWords: string[] = [
    "badword1",
    "badword2",
    "badword3",
    // In a real implementation, this would be a comprehensive list
  ];

  // Words close to profanity that need review
  private suspiciousWords: string[] = [
    "suspicious1",
    "suspicious2",
    // Words that might be inappropriate in context
  ];

  constructor(customProfaneWords: string[] = []) {
    // Merge custom profane words with default list
    this.profaneWords = [...this.profaneWords, ...customProfaneWords];
  }

  /**
   * Filter profanity from content by replacing it with asterisks
   */
  public filter(content: string): string {
    let filteredContent = content;

    // Replace each profane word with asterisks
    this.profaneWords.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      filteredContent = filteredContent.replace(regex, "*".repeat(word.length));
    });

    return filteredContent;
  }

  /**
   * Check if content contains profanity
   */
  public isAppropriate(content: string): boolean {
    const contentLower = content.toLowerCase();

    // Check for exact profane words
    for (const word of this.profaneWords) {
      const regex = new RegExp(`\\b${word}\\b`, "i");
      if (regex.test(contentLower)) {
        return false;
      }
    }

    // Content is appropriate if no profanity is found
    return true;
  }

  /**
   * Check if content contains suspicious words that need review
   */
  public needsReview(content: string): boolean {
    const contentLower = content.toLowerCase();

    // Check for suspicious words
    for (const word of this.suspiciousWords) {
      const regex = new RegExp(`\\b${word}\\b`, "i");
      if (regex.test(contentLower)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get the name of this strategy
   */
  public getName(): string {
    return "Profanity Filter";
  }
}

/**
 * Strategy for filtering adult content
 */
export class AdultContentFilterStrategy implements ContentFilterStrategy {
  private adultTerms: string[] = [
    "adult1",
    "adult2",
    "adult3",
    // In a real implementation, this would be a comprehensive list
  ];

  constructor(customAdultTerms: string[] = []) {
    // Merge custom adult terms with default list
    this.adultTerms = [...this.adultTerms, ...customAdultTerms];
  }

  /**
   * Filter adult content by replacing it with a generic message
   */
  public filter(content: string): string {
    let filteredContent = content;

    // Replace each adult term
    this.adultTerms.forEach((term) => {
      const regex = new RegExp(`\\b${term}\\b`, "gi");
      filteredContent = filteredContent.replace(regex, "[adult content]");
    });

    return filteredContent;
  }

  /**
   * Check if content contains adult terms
   */
  public isAppropriate(content: string): boolean {
    const contentLower = content.toLowerCase();

    // Check for adult terms
    for (const term of this.adultTerms) {
      const regex = new RegExp(`\\b${term}\\b`, "i");
      if (regex.test(contentLower)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get the name of this strategy
   */
  public getName(): string {
    return "Adult Content Filter";
  }
}

/**
 * Strategy for filtering sensitive information like phone numbers and emails
 */
export class PersonalInfoFilterStrategy implements ContentFilterStrategy {
  /**
   * Filter personal information like phone numbers and email addresses
   */
  public filter(content: string): string {
    let filteredContent = content;

    // Filter phone numbers (simple pattern for demonstration)
    filteredContent = filteredContent.replace(
      /(\+\d{1,3}[\s-])?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
      "[PHONE NUMBER REDACTED]"
    );

    // Filter email addresses
    filteredContent = filteredContent.replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      "[EMAIL REDACTED]"
    );

    return filteredContent;
  }

  /**
   * Check if content contains personal information
   */
  public isAppropriate(content: string): boolean {
    // Check for phone numbers
    const phoneRegex = /(\+\d{1,3}[\s-])?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
    if (phoneRegex.test(content)) {
      return false;
    }

    // Check for email addresses
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    if (emailRegex.test(content)) {
      return false;
    }

    return true;
  }

  /**
   * Get the name of this strategy
   */
  public getName(): string {
    return "Personal Information Filter";
  }
}

/**
 * Composite strategy that combines multiple filtering strategies
 */
export class CompositeFilterStrategy implements ContentFilterStrategy {
  private strategies: ContentFilterStrategy[] = [];
  private name: string;

  constructor(name: string = "Composite Filter") {
    this.name = name;
  }

  /**
   * Add a strategy to the composite
   */
  public addStrategy(strategy: ContentFilterStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * Apply all strategies in sequence
   */
  public filter(content: string): string {
    let filteredContent = content;

    // Apply each strategy in sequence
    for (const strategy of this.strategies) {
      filteredContent = strategy.filter(filteredContent);
    }

    return filteredContent;
  }

  /**
   * Content is appropriate only if it passes all strategies
   */
  public isAppropriate(content: string): boolean {
    // Check all strategies
    for (const strategy of this.strategies) {
      if (!strategy.isAppropriate(content)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get the name of this composite strategy
   */
  public getName(): string {
    return this.name;
  }
}

/**
 * Context class that uses a filtering strategy
 */
export class ContentFilter {
  private strategy: ContentFilterStrategy;

  constructor(strategy: ContentFilterStrategy) {
    this.strategy = strategy;
  }

  /**
   * Set a new filtering strategy
   */
  public setStrategy(strategy: ContentFilterStrategy): void {
    this.strategy = strategy;
  }

  /**
   * Filter content using the current strategy
   */
  public filterContent(content: string): string {
    return this.strategy.filter(content);
  }

  /**
   * Check if content is appropriate using the current strategy
   */
  public isContentAppropriate(content: string): boolean {
    return this.strategy.isAppropriate(content);
  }

  /**
   * Get the name of the current strategy
   */
  public getStrategyName(): string {
    return this.strategy.getName();
  }
}

/**
 * Factory for creating common filter combinations
 */
export class ContentFilterFactory {
  /**
   * Create a standard filter for fiction content
   */
  public static createFictionFilter(): ContentFilter {
    const composite = new CompositeFilterStrategy("Standard Fiction Filter");
    composite.addStrategy(new ProfanityFilterStrategy());
    composite.addStrategy(new PersonalInfoFilterStrategy());

    return new ContentFilter(composite);
  }

  /**
   * Create a strict filter for young adult content
   */
  public static createYoungAdultFilter(): ContentFilter {
    const composite = new CompositeFilterStrategy("Young Adult Filter");
    composite.addStrategy(new ProfanityFilterStrategy());
    composite.addStrategy(new AdultContentFilterStrategy());
    composite.addStrategy(new PersonalInfoFilterStrategy());

    return new ContentFilter(composite);
  }

  /**
   * Create a filter for comments
   */
  public static createCommentFilter(): ContentFilter {
    const composite = new CompositeFilterStrategy("Comment Filter");
    composite.addStrategy(new ProfanityFilterStrategy());
    composite.addStrategy(new PersonalInfoFilterStrategy());

    return new ContentFilter(composite);
  }

  /**
   * Create a custom filter with specified strategies
   */
  public static createCustomFilter(
    name: string,
    strategies: ContentFilterStrategy[]
  ): ContentFilter {
    const composite = new CompositeFilterStrategy(name);
    strategies.forEach((strategy) => composite.addStrategy(strategy));

    return new ContentFilter(composite);
  }
}
