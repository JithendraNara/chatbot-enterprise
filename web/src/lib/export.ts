import { Conversation } from '../stores/chatStore';

export function exportConversationToMarkdown(conversation: Conversation): string {
  const date = new Date(conversation.createdAt).toLocaleDateString();
  let markdown = `# ${conversation.title}\n\n`;
  markdown += `**Date:** ${date}\n\n`;
  markdown += `---\n\n`;

  conversation.messages.forEach((message) => {
    const role = message.role === 'user' ? '**User**' : '**Assistant**';
    const time = new Date(message.timestamp).toLocaleTimeString();
    markdown += `${role} (${time}):\n\n`;
    markdown += `${message.content}\n\n`;
    
    if (message.attachments && message.attachments.length > 0) {
      markdown += `*Attachments:* ${message.attachments.length} file(s)\n\n`;
    }
    
    markdown += `---\n\n`;
  });

  return markdown;
}

export function exportConversationToJSON(conversation: Conversation): string {
  return JSON.stringify({
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messages: conversation.messages,
  }, null, 2);
}

export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportAllConversations(conversations: Conversation[]): string {
  const exportData = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    conversations: conversations.map(conv => ({
      id: conv.id,
      title: conv.title,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      messages: conv.messages,
    })),
  };
  
  return JSON.stringify(exportData, null, 2);
}

export function importConversations(jsonString: string): Conversation[] | null {
  try {
    const data = JSON.parse(jsonString);
    
    // Handle single conversation export
    if (data.messages && !data.conversations) {
      return [data as Conversation];
    }
    
    // Handle multiple conversations export
    if (data.conversations && Array.isArray(data.conversations)) {
      return data.conversations as Conversation[];
    }
    
    return null;
  } catch {
    return null;
  }
}
