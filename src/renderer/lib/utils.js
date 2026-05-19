import { marked } from 'marked';

// Auto-link bare URLs in text
const linkifyExtension = {
  name: 'linkify',
  level: 'inline',
  start(src) {
    return src.match(/https?:\/\//)?.index;
  },
  tokenizer(src) {
    const match = src.match(/^(https?:\/\/[^\s<>\])"']+)/);
    if (match) {
      return {
        type: 'linkify',
        raw: match[0],
        url: match[0]
      };
    }
  },
  renderer(token) {
    return `<a href="${token.url}" target="_blank" rel="noopener noreferrer">${token.url}</a>`;
  }
};

marked.use({ extensions: [linkifyExtension] });

export function renderMarkdown(text) {
  if (!text) return '';
  return marked.parse(text, { breaks: true });
}

// Date utilities
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getDueDateStatus(dateStr) {
  if (!dateStr) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Parse as local date (not UTC) by splitting the date string
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const [year, month, day] = parts.map(Number);
  const dueDate = new Date(year, month - 1, day);

  if (dueDate < today) return 'overdue';
  if (dueDate.getTime() === today.getTime()) return 'today';
  if (dueDate.getTime() === tomorrow.getTime()) return 'tomorrow';
  return 'future';
}

export function getDueDateLabel(dateStr) {
  if (!dateStr) return '';
  const status = getDueDateStatus(dateStr);
  if (!status) return '';

  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const [year, month, day] = parts.map(Number);
  const date = new Date(year, month - 1, day);
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  switch (status) {
    case 'overdue': return `\u26A0 Overdue \u2014 ${formatted}`;
    case 'today': return `\uD83D\uDCC5 Due today`;
    case 'tomorrow': return `\uD83D\uDCC5 Due tomorrow`;
    default: return `\uD83D\uDCC5 ${formatted}`;
  }
}
