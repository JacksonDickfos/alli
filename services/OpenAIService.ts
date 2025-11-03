import axios from 'axios';
import { conversationManager, Message } from './ConversationManager';

// OpenAI API configuration
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech';

if (!OPENAI_API_KEY) {
  console.warn('OpenAI API key not found. Please set EXPO_PUBLIC_OPENAI_API_KEY in your environment variables.');
}

export interface OpenAIResponse {
  content: string;
  success: boolean;
  error?: string;
}

export interface RealtimeChatOptions {
  onDelta: (delta: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: string) => void;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

class OpenAIService {
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
  };

  // Convert conversation messages to OpenAI format
  private formatMessagesForOpenAI(messages: Message[]): Array<{ role: string; content: string }> {
    const systemPrompt = `You are Alli, a friendly and knowledgeable nutrition AI assistant. You help users with:

- Nutrition advice and meal planning
- Understanding macronutrients and micronutrients
- Weight management and fitness goals
- Healthy eating habits and lifestyle tips
- Answering questions about food, supplements, and dietary restrictions

Keep your responses conversational, helpful, and concise. Use emojis occasionally to make the conversation more engaging. If you don't know something, be honest about it and suggest where they might find reliable information.

Current context: The user is using a nutrition tracking app, so you can reference their goals, progress, and logged foods when relevant.`;

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    return formattedMessages;
  }

  // Sleep function for retry delays
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Calculate exponential backoff delay
  private calculateDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(2, attempt - 1);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  // Send message to OpenAI with retry logic
  async sendMessage(userMessage: string): Promise<OpenAIResponse> {
    if (!OPENAI_API_KEY) {
      return {
        content: 'OpenAI API key not configured. Please check your environment variables.',
        success: false,
        error: 'API_KEY_MISSING',
      };
    }

    try {
      // Get conversation context
      const context = await conversationManager.getCurrentConversation();
      const contextMessages = conversationManager.getContextForAI();

      // Add user message to conversation
      await conversationManager.addMessage('user', userMessage);

      // Format messages for OpenAI
      const messages = this.formatMessagesForOpenAI(contextMessages);

      // Add the new user message
      messages.push({ role: 'user', content: userMessage });

      let lastError: any;
      
      // Retry logic with exponential backoff
      for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
        try {
          const response = await axios.post(
            OPENAI_API_URL,
            {
              model: 'gpt-4o',
              messages,
              max_tokens: 500,
              temperature: 0.7,
              stream: false,
            },
            {
              headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
              },
              timeout: 30000, // 30 second timeout
            }
          );

          const aiResponse = response.data.choices[0]?.message?.content;
          
          if (!aiResponse) {
            throw new Error('No response from OpenAI');
          }

          // Save AI response to conversation
          await conversationManager.addMessage('assistant', aiResponse);

          // Update conversation title if it's the first exchange
          if (contextMessages.length === 0) {
            const title = this.generateConversationTitle(userMessage);
            await conversationManager.updateConversationTitle(title);
          }

          return {
            content: aiResponse,
            success: true,
          };

        } catch (error: any) {
          lastError = error;
          
          // Check if it's a rate limit error
          if (error.response?.status === 429) {
            console.warn(`Rate limit hit, attempt ${attempt}/${this.retryConfig.maxRetries}`);
            
            if (attempt < this.retryConfig.maxRetries) {
              const delay = this.calculateDelay(attempt);
              await this.sleep(delay);
              continue;
            }
          }
          
          // Check if it's a network error
          if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED') {
            console.warn(`Network error, attempt ${attempt}/${this.retryConfig.maxRetries}`);
            
            if (attempt < this.retryConfig.maxRetries) {
              const delay = this.calculateDelay(attempt);
              await this.sleep(delay);
              continue;
            }
          }
          
          // For other errors, don't retry
          break;
        }
      }

      // All retries failed
      return {
        content: this.getErrorMessage(lastError),
        success: false,
        error: lastError?.response?.status?.toString() || 'UNKNOWN_ERROR',
      };

    } catch (error: any) {
      console.error('OpenAI service error:', error);
      return {
        content: 'Sorry, I encountered an error. Please try again.',
        success: false,
        error: error.message,
      };
    }
  }

  // Generate a conversation title from the first user message
  private generateConversationTitle(userMessage: string): string {
    const words = userMessage.split(' ').slice(0, 5);
    return words.join(' ') + (userMessage.split(' ').length > 5 ? '...' : '');
  }

  // Get user-friendly error message
  private getErrorMessage(error: any): string {
    if (error.response?.status === 429) {
      return 'I\'m getting too many requests right now. Please wait a moment and try again.';
    }
    
    if (error.response?.status === 401) {
      return 'There\'s an issue with my API configuration. Please contact support.';
    }
    
    if (error.response?.status === 500) {
      return 'I\'m experiencing some technical difficulties. Please try again in a moment.';
    }
    
    if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED') {
      return 'I\'m having trouble connecting. Please check your internet connection and try again.';
    }
    
    return 'Sorry, something went wrong. Please try again.';
  }

  // Generate speech from text using OpenAI TTS
  async generateSpeech(text: string, voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'nova'): Promise<string | null> {
    if (!OPENAI_API_KEY) {
      console.warn('OpenAI API key not found for TTS');
      return null;
    }

    try {
      const response = await axios.post(
        OPENAI_TTS_URL,
        {
          model: 'tts-1', // or 'tts-1-hd' for better quality
          input: text,
          voice: voice, // Options: alloy, echo, fable, onyx, nova, shimmer. 'nova' is warm and friendly
          response_format: 'mp3',
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          responseType: 'blob', // For binary audio data
        }
      );

      // Convert blob to data URL for playback
      const blob = response.data;
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onloadend = () => {
          const audioDataUrl = reader.result as string;
          resolve(audioDataUrl);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error: any) {
      console.error('Error generating speech:', error);
      return null;
    }
  }

  // Streaming method for real-time conversation  
  async sendMessageStreaming(userInput: string, options: RealtimeChatOptions): Promise<void> {
    if (!OPENAI_API_KEY) {
      options.onError('OpenAI API key not found');
      return;
    }

    try {
      const contextMessages = conversationManager.getContextForAI();
      contextMessages.push({ role: 'user', content: userInput } as Message);
      
      // Add user message to conversation
      await conversationManager.addMessage('user', userInput);

      // Since React Native doesn't support streaming directly, we'll simulate it
      // by requesting the full response, then chunk it for visual effect
      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: 'gpt-4o',
          messages: this.formatMessagesForOpenAI(contextMessages),
          stream: false, // Set to false since streaming is unreliable
          temperature: 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const fullResponse = response.data.choices[0]?.message?.content;
      
      if (!fullResponse) {
        throw new Error('No response from OpenAI');
      }

      // Simulate streaming by chunking the response
      const words = fullResponse.split(' ');
      let currentText = '';
      
      for (let i = 0; i < words.length; i++) {
        currentText += (i > 0 ? ' ' : '') + words[i];
        options.onDelta(words[i] + (i < words.length - 1 ? ' ' : ''));
        
        // Small delay to simulate real-time streaming
        if (i < words.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      }

      // Store in conversation
      await conversationManager.addMessage('assistant', fullResponse);
      
      options.onComplete(fullResponse);

    } catch (error: any) {
      console.error('Error in streaming request:', error);
      options.onError(error.message || 'Failed to get streaming response');
    }
  }

  // Test OpenAI connection
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.sendMessage('Hello, are you working?');
      return response.success;
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const openAIService = new OpenAIService();
