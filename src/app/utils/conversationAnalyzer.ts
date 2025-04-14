type MessageRole = "system" | "user" | "assistant";

interface ConversationContext {
  lastMentionedRepo?: { 
    owner: string; 
    repo: string;
    lastMentioned: Date;
  };
  lastMentionedFile?: string;
  currentTopic?: string;
  fileReferences: Set<string>;
  conversationHistory: Array<{ role: MessageRole; content: string }>;
}

interface AnalysisResult {
  repository?: {
    owner: string;
    repo: string;
    confidence: number;
  };
  fileReferences?: string[];
  intent: "question" | "browse" | "analyze" | "explain";
  requiresIndexing: boolean;
}

export class ConversationAnalyzer {
  private context: ConversationContext;

  constructor() {
    this.context = {
      conversationHistory: [],
      fileReferences: new Set()
    };
  }

  public async analyzeMessage(message: string): Promise<AnalysisResult> {
    try {
      // Add message to conversation history
      this.addToHistory("user", message);

      // Call the API route for analysis
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message,
          context: this.formatConversationContext()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze message');
      }

      const data = await response.json();
      const analysis = this.parseAndValidateResponse(data.analysis);
      
      // Update context with the analysis
      this.updateContextWithAnalysis(analysis);
      
      return analysis;
    } catch (error) {
      console.error('Error analyzing message:', error);
      return this.getFallbackAnalysis();
    }
  }

  public updateContext(response: string) {
    this.addToHistory("assistant", response);
  }

  private addToHistory(role: MessageRole, content: string) {
    this.context.conversationHistory.push({ role, content });
    
    // Keep conversation history manageable
    if (this.context.conversationHistory.length > 10) {
      this.context.conversationHistory = this.context.conversationHistory.slice(-10);
    }
  }

  private formatConversationContext(): string {
    return JSON.stringify({
      lastMentionedRepo: this.context.lastMentionedRepo,
      lastMentionedFile: this.context.lastMentionedFile,
      currentTopic: this.context.currentTopic,
      fileReferences: Array.from(this.context.fileReferences),
      conversationHistory: this.context.conversationHistory
    });
  }

  private updateContextWithAnalysis(analysis: AnalysisResult) {
    if (analysis.repository && analysis.repository.confidence > 0.7) {
      this.context.lastMentionedRepo = {
        ...analysis.repository,
        lastMentioned: new Date()
      };
    }

    if (analysis.fileReferences?.length) {
      analysis.fileReferences.forEach(file => 
        this.context.fileReferences.add(file)
      );
    }
  }

  private parseAndValidateResponse(response: any): AnalysisResult {
    try {
      const result = typeof response === 'string' ? JSON.parse(response) : response;
      
      // Validate structure
      if (this.isValidAnalysisResult(result)) {
        return result;
      }
      
      return this.getFallbackAnalysis();
    } catch (error) {
      console.error("Error parsing response:", error);
      return this.getFallbackAnalysis();
    }
  }

  private isValidAnalysisResult(result: any): result is AnalysisResult {
    return (
      result &&
      (result.repository === null || 
        (typeof result.repository === 'object' &&
         typeof result.repository.owner === 'string' &&
         typeof result.repository.repo === 'string' &&
         typeof result.repository.confidence === 'number')) &&
      Array.isArray(result.fileReferences) &&
      typeof result.intent === 'string' &&
      ['question', 'browse', 'analyze', 'explain'].includes(result.intent) &&
      typeof result.requiresIndexing === 'boolean'
    );
  }

  private getFallbackAnalysis(): AnalysisResult {
    return {
      repository: undefined,
      fileReferences: [],
      intent: "question",
      requiresIndexing: false
    };
  }
} 