import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const NOTION_TOKEN = process.env.NOTION_TOKEN || 'ntn_kP36443001250ZD4POrY2x87yql2zwGWY4Zmpihsf3I2nw';

// Individual onboarding pages with full iMessage transcripts
const CONVERSATION_PAGES: Record<string, string> = {
  'Charles Hickok': '32e015b8-c2bc-8175-92f8-ecdc4dd06379',
  'Austin Sarvis': '32e015b8-c2bc-81c4-94d2-f64086f60a52',
  'Colby Resh': '32e015b8-c2bc-81dd-b3f8-ff934878ffc6',
  'Jack Robinson': '32e015b8-c2bc-8143-924d-fde1f85cedc1',
  'Grady Pierce': '32e015b8-c2bc-81a5-88fe-e7adb6ababb2',
  'Joseph Meyers': '32e015b8-c2bc-8118-9bab-dffe695c9155',
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const contactName = searchParams.get('contact');
    const pageId = searchParams.get('pageId');

    const notion = new Client({ auth: NOTION_TOKEN });

    // If a specific page ID is provided, fetch that page's content
    const targetPageId = pageId || (contactName ? CONVERSATION_PAGES[contactName] : null);

    if (targetPageId) {
      return await fetchConversationPage(notion, targetPageId, contactName || '');
    }

    // Otherwise return the list of available conversation pages
    const available = Object.entries(CONVERSATION_PAGES).map(([name, id]) => ({
      name,
      pageId: id,
      initials: name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
    }));

    return NextResponse.json({ conversations: available });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch conversations';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function fetchConversationPage(notion: Client, pageId: string, contactName: string) {
  // Fetch page blocks (the actual content with message transcripts)
  const blocks = await notion.blocks.children.list({
    block_id: pageId,
    page_size: 100,
  });

  const messages: Array<{
    id: string;
    direction: 'outgoing' | 'incoming';
    text: string;
    timestamp: string;
    aiGenerated: boolean;
  }> = [];

  let msgIndex = 0;

  for (const block of blocks.results) {
    if (!('type' in block)) continue;

    let text = '';

    // Extract text from different block types
    if (block.type === 'paragraph' && 'paragraph' in block) {
      text = extractRichText(block.paragraph.rich_text);
    } else if (block.type === 'bulleted_list_item' && 'bulleted_list_item' in block) {
      text = extractRichText(block.bulleted_list_item.rich_text);
    } else if (block.type === 'numbered_list_item' && 'numbered_list_item' in block) {
      text = extractRichText(block.numbered_list_item.rich_text);
    } else if (block.type === 'quote' && 'quote' in block) {
      text = extractRichText(block.quote.rich_text);
    }

    if (!text.trim()) continue;

    // Parse message direction: "Jackson →" = outgoing, anything else with "→" = incoming
    const arrowMatch = text.match(/^(.+?)\s*[→➡\->]+\s*([\s\S]*)/);
    if (arrowMatch) {
      const sender = arrowMatch[1].trim().toLowerCase();
      const messageText = arrowMatch[2].trim();
      const isOutgoing = sender === 'jackson' || sender === 'me' || sender === 'j';

      if (messageText) {
        messages.push({
          id: `msg-${msgIndex++}`,
          direction: isOutgoing ? 'outgoing' : 'incoming',
          text: messageText,
          timestamp: '',
          aiGenerated: false,
        });
      }
    } else {
      // No arrow pattern — treat as a continuation or standalone message
      // Check if it looks like a response (short, casual)
      if (messages.length > 0) {
        // Append to previous or treat as new incoming
        messages.push({
          id: `msg-${msgIndex++}`,
          direction: 'incoming',
          text: text.trim(),
          timestamp: '',
          aiGenerated: false,
        });
      }
    }
  }

  // Also fetch page properties for metadata
  const page = await notion.pages.retrieve({ page_id: pageId });
  let title = contactName;
  if ('properties' in page) {
    const titleProp = Object.values(page.properties).find(
      (p) => (p as { type: string }).type === 'title'
    ) as { type: 'title'; title: Array<{ plain_text: string }> } | undefined;
    if (titleProp && titleProp.title.length > 0) {
      title = titleProp.title.map(t => t.plain_text).join('');
    }
  }

  return NextResponse.json({
    pageId,
    title,
    contactName,
    messages,
    messageCount: messages.length,
  });
}

function extractRichText(richText: Array<{ plain_text: string }>): string {
  if (!Array.isArray(richText)) return '';
  return richText.map(t => t.plain_text).join('');
}
