import { supabase } from '../lib/supabase';

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

export interface ConversationContext {
  conversationId: string;
  messages: Message[];
}

class ConversationManager {
  private currentConversationId: string | null = null;
  private messages: Message[] = [];

  // Get current user ID from Supabase session
  private async getUserId(): Promise<string | null> {
    try {
      // First try to get the session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        return null;
      }
      
      if (!session || !session.user) {
        console.error('No active session found');
        return null;
      }
      
      return session.user.id;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  }

  // Get or create current conversation
  async getCurrentConversation(): Promise<ConversationContext> {
    if (this.currentConversationId) {
      // Load existing conversation
      try {
        const { data: messages, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', this.currentConversationId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error loading messages:', error);
          throw error;
        }

        this.messages = messages || [];
        return {
          conversationId: this.currentConversationId,
          messages: this.messages,
        };
      } catch (error) {
        console.error('Error in getCurrentConversation:', error);
        throw error;
      }
    } else {
      // Create new conversation
      try {
        const userId = await this.getUserId();
        
        if (!userId) {
          throw new Error('User not authenticated');
        }

        const { data: conversation, error } = await supabase
          .from('conversations')
          .insert({
            user_id: userId,
            title: 'New Conversation',
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating conversation:', error);
          throw error;
        }

        this.currentConversationId = conversation.id;
        this.messages = [];
        
        return {
          conversationId: this.currentConversationId,
          messages: this.messages,
        };
      } catch (error) {
        console.error('Error creating conversation in Supabase:', error);
        throw error;
      }
    }
  }

  // Add a message to the current conversation
  async addMessage(role: 'user' | 'assistant', content: string): Promise<Message> {
    if (!this.currentConversationId) {
      await this.getCurrentConversation();
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: this.currentConversationId!,
        role,
        content,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding message:', error);
      throw error;
    }

    this.messages.push(message);
    return message;
  }

  // Get conversation context for OpenAI (last 15 messages)
  getContextForAI(): Message[] {
    return this.messages.slice(-15);
  }

  // Get recent conversations for the user
  async getRecentConversations(limit: number = 10): Promise<Conversation[]> {
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        *,
        messages (
          id,
          role,
          content,
          created_at
        )
      `)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error loading conversations:', error);
      throw error;
    }

    return conversations || [];
  }

  // Start a new conversation
  async startNewConversation(): Promise<ConversationContext> {
    this.currentConversationId = null;
    this.messages = [];
    return await this.getCurrentConversation();
  }

  // Update conversation title
  async updateConversationTitle(title: string): Promise<void> {
    if (!this.currentConversationId) return;

    const { error } = await supabase
      .from('conversations')
      .update({ title })
      .eq('id', this.currentConversationId);

    if (error) {
      console.error('Error updating conversation title:', error);
      throw error;
    }
  }

  // Delete a conversation
  async deleteConversation(conversationId: string): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }

    // If we're deleting the current conversation, start a new one
    if (this.currentConversationId === conversationId) {
      await this.startNewConversation();
    }
  }

  // Get current conversation ID
  getCurrentConversationId(): string | null {
    return this.currentConversationId;
  }

  // Get current messages
  getCurrentMessages(): Message[] {
    return this.messages;
  }
}

// Export singleton instance
export const conversationManager = new ConversationManager();
