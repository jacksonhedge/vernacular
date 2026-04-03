import { NextResponse } from 'next/server';

type Msg = { id: string; direction: 'outgoing' | 'incoming'; text: string; timestamp: string; aiGenerated: boolean };
type ConvData = { name: string; phone: string; email: string; school: string; org: string; venmo: string; status: string; messages: Msg[] };

// Demo conversation data (anonymized)
const CONVERSATIONS: Record<string, ConvData> = {
  '32e015b8-c2bc-81c4-94d2-f64086f60a52': {
    name: 'Alex Thompson', phone: '(555) 123-4001', email: 'alex@example.com',
    school: 'State University', org: 'Greek Life', venmo: 'alexthompson', status: 'Onboarded',
    messages: [
      { id: 'as1', direction: 'outgoing', text: 'Hey Alex, this is the team running the sponsor promotion for the spring event', timestamp: '3/25 2:30 PM', aiGenerated: false },
      { id: 'as2', direction: 'outgoing', text: 'Saw you signed up, just wanted to confirm your payment info. What is your Venmo?', timestamp: '3/25 2:30 PM', aiGenerated: false },
      { id: 'as3', direction: 'incoming', text: 'It is alexthompson', timestamp: '3/25 2:35 PM', aiGenerated: false },
      { id: 'as4', direction: 'outgoing', text: 'Sending the payment in the next few minutes, be on the lookout and lmk when you get it!', timestamp: '3/25 2:40 PM', aiGenerated: false },
      { id: 'as5', direction: 'incoming', text: 'I got it', timestamp: '3/25 2:45 PM', aiGenerated: false },
      { id: 'as6', direction: 'outgoing', text: 'Sent! Let me know if you see it', timestamp: '3/25 2:46 PM', aiGenerated: false },
      { id: 'as7', direction: 'outgoing', text: 'https://example.com/promo', timestamp: '3/25 2:47 PM', aiGenerated: false },
      { id: 'as8', direction: 'outgoing', text: 'Here is the sponsor app link, check it out and use the credit on the upcoming events', timestamp: '3/25 2:47 PM', aiGenerated: false },
    ],
  },
  '32e015b8-c2bc-8175-92f8-ecdc4dd06379': {
    name: 'Brian Mitchell', phone: '(555) 123-4002', email: 'brian@example.com',
    school: 'State University', org: 'Greek Life', venmo: 'brianmitchell', status: 'Awaiting Confirmation',
    messages: [
      { id: 'ch1', direction: 'outgoing', text: 'Hey Brian, this is the team running the sponsor promotion for the spring event', timestamp: '3/25 2:00 PM', aiGenerated: false },
      { id: 'ch2', direction: 'outgoing', text: 'Saw you signed up, just wanted to confirm your payment info. What is your Venmo?', timestamp: '3/25 2:00 PM', aiGenerated: false },
      { id: 'ch3', direction: 'incoming', text: "Hey what's up it's brianmitchell", timestamp: '3/25 2:10 PM', aiGenerated: false },
      { id: 'ch4', direction: 'outgoing', text: 'Sending the payment in the next few minutes, be on the lookout and lmk when you get it!', timestamp: '3/25 2:15 PM', aiGenerated: false },
      { id: 'ch5', direction: 'outgoing', text: 'Sent! Let me know if you see it', timestamp: '3/25 2:20 PM', aiGenerated: false },
      { id: 'ch6', direction: 'outgoing', text: 'https://example.com/promo', timestamp: '3/25 2:21 PM', aiGenerated: false },
      { id: 'ch7', direction: 'outgoing', text: 'Here is the sponsor app link, check it out and use the credit on the upcoming events', timestamp: '3/25 2:21 PM', aiGenerated: false },
    ],
  },
  '32e015b8-c2bc-81dd-b3f8-ff934878ffc6': {
    name: 'Chris Davis', phone: '(555) 123-4003', email: 'chris@example.com',
    school: 'State University', org: 'Greek Life', venmo: 'chrisdavis', status: 'Onboarded',
    messages: [
      { id: 'cr1', direction: 'outgoing', text: 'Hey Chris, this is the team running the sponsor promotion for the spring event', timestamp: '3/25 1:30 PM', aiGenerated: false },
      { id: 'cr2', direction: 'outgoing', text: 'Saw you signed up, just wanted to confirm your payment info. What is your Venmo?', timestamp: '3/25 1:30 PM', aiGenerated: false },
      { id: 'cr3', direction: 'incoming', text: "Hey it's chrisdavis", timestamp: '3/25 1:40 PM', aiGenerated: false },
      { id: 'cr4', direction: 'outgoing', text: 'Sweet, sending in a sec', timestamp: '3/25 1:42 PM', aiGenerated: false },
      { id: 'cr5', direction: 'outgoing', text: 'lmk if you got it! I will drop the link and then you can let me know once everything is set up', timestamp: '3/25 1:45 PM', aiGenerated: false },
      { id: 'cr6', direction: 'incoming', text: 'I got the payment', timestamp: '3/25 1:50 PM', aiGenerated: false },
      { id: 'cr7', direction: 'incoming', text: 'Sounds good', timestamp: '3/25 1:50 PM', aiGenerated: false },
      { id: 'cr8', direction: 'outgoing', text: 'Here is the link: https://example.com/promo', timestamp: '3/25 1:55 PM', aiGenerated: false },
      { id: 'cr9', direction: 'outgoing', text: 'If there are any issues with it, lmk (verification, setup issues, etc.)', timestamp: '3/25 1:55 PM', aiGenerated: false },
    ],
  },
  '32e015b8-c2bc-8143-924d-fde1f85cedc1': {
    name: 'Derek Wilson', phone: '(555) 123-4004', email: 'derek@example.com',
    school: 'State University', org: 'Greek Life', venmo: 'derekwilson', status: 'Onboarded',
    messages: [
      { id: 'jr1', direction: 'outgoing', text: 'Hey Derek, this is the team running the sponsor promotion for the spring event', timestamp: '3/25 1:00 PM', aiGenerated: false },
      { id: 'jr2', direction: 'outgoing', text: 'Saw you signed up, just wanted to confirm your payment info. What is your Venmo?', timestamp: '3/25 1:00 PM', aiGenerated: false },
      { id: 'jr3', direction: 'incoming', text: "What's this for again, I forgot", timestamp: '3/25 1:15 PM', aiGenerated: false },
      { id: 'jr4', direction: 'outgoing', text: "No worries -- we're running a sponsorship for the spring event and the form was for the first 25 people to get a free credit on the platform. What's your Venmo so I can send it over?", timestamp: '3/25 1:18 PM', aiGenerated: true },
      { id: 'jr5', direction: 'incoming', text: 'Oh ok my Venmo is derekwilson', timestamp: '3/25 1:25 PM', aiGenerated: false },
      { id: 'jr6', direction: 'outgoing', text: "Sweet, I'll get it over", timestamp: '3/25 1:27 PM', aiGenerated: false },
      { id: 'jr7', direction: 'outgoing', text: 'Sending the payment in the next few minutes, be on the lookout and lmk when you get it!', timestamp: '3/25 1:30 PM', aiGenerated: false },
      { id: 'jr8', direction: 'incoming', text: 'Just got it appreciate it', timestamp: '3/25 1:40 PM', aiGenerated: false },
      { id: 'jr9', direction: 'outgoing', text: 'Sent! Let me know if you see it', timestamp: '3/25 1:41 PM', aiGenerated: false },
      { id: 'jr10', direction: 'outgoing', text: 'https://example.com/promo', timestamp: '3/25 1:42 PM', aiGenerated: false },
      { id: 'jr11', direction: 'outgoing', text: 'Here is the sponsor app link, check it out and use the credit on the upcoming events', timestamp: '3/25 1:42 PM', aiGenerated: false },
    ],
  },
  '32e015b8-c2bc-81a5-88fe-e7adb6ababb2': {
    name: 'Evan Parker', phone: '(555) 123-4005', email: 'evan@example.com',
    school: 'State University', org: 'Greek Life', venmo: 'evanparker', status: 'Awaiting Confirmation',
    messages: [
      { id: 'gp1', direction: 'outgoing', text: 'Hey Evan, this is the team running the sponsor promotion for the spring event', timestamp: '3/25 3:00 PM', aiGenerated: false },
      { id: 'gp2', direction: 'outgoing', text: 'Saw you signed up, just wanted to confirm your payment info. What is your Venmo?', timestamp: '3/25 3:00 PM', aiGenerated: false },
      { id: 'gp3', direction: 'incoming', text: "Hey what's up, saw the form thought it sounded great. My Venmo is evanparker", timestamp: '3/25 3:10 PM', aiGenerated: false },
      { id: 'gp4', direction: 'outgoing', text: 'Sending the payment in the next few minutes, be on the lookout and lmk when you get it!', timestamp: '3/25 3:15 PM', aiGenerated: false },
      { id: 'gp5', direction: 'incoming', text: "Perfect. I'll let you know when it comes", timestamp: '3/25 3:18 PM', aiGenerated: false },
      { id: 'gp6', direction: 'outgoing', text: 'Sent! Let me know if you see it', timestamp: '3/25 3:25 PM', aiGenerated: false },
      { id: 'gp7', direction: 'outgoing', text: 'https://example.com/promo', timestamp: '3/25 3:26 PM', aiGenerated: false },
      { id: 'gp8', direction: 'outgoing', text: 'Here is the sponsor app link, check it out and use the credit on the upcoming events', timestamp: '3/25 3:26 PM', aiGenerated: false },
    ],
  },
  '32e015b8-c2bc-8118-9bab-dffe695c9155': {
    name: 'Frank Martinez', phone: '(555) 123-4006', email: 'frank@example.com',
    school: 'State University', org: 'Greek Life', venmo: 'frankmartinez', status: 'Onboarded',
    messages: [
      { id: 'jm1', direction: 'outgoing', text: 'Hey Frank, this is the team running the sponsor promotion for the spring event', timestamp: '3/25 3:30 PM', aiGenerated: false },
      { id: 'jm2', direction: 'outgoing', text: 'Saw you signed up, just wanted to confirm your payment info. What is your Venmo?', timestamp: '3/25 3:30 PM', aiGenerated: false },
      { id: 'jm3', direction: 'incoming', text: "Hey my Venmo is frankmartinez, is there any next steps?", timestamp: '3/25 3:40 PM', aiGenerated: false },
      { id: 'jm4', direction: 'outgoing', text: 'Sending the payment in the next few minutes, be on the lookout and lmk when you get it!', timestamp: '3/25 3:45 PM', aiGenerated: false },
      { id: 'jm5', direction: 'incoming', text: 'Just got it thanks', timestamp: '3/25 3:55 PM', aiGenerated: false },
      { id: 'jm6', direction: 'outgoing', text: 'Sent! Let me know if you see it', timestamp: '3/25 3:56 PM', aiGenerated: false },
      { id: 'jm7', direction: 'outgoing', text: 'https://example.com/promo', timestamp: '3/25 3:57 PM', aiGenerated: false },
      { id: 'jm8', direction: 'outgoing', text: 'Here is the sponsor app link, check it out and use the credit on the upcoming events', timestamp: '3/25 3:57 PM', aiGenerated: false },
    ],
  },
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get('pageId');
    const contactName = searchParams.get('contact');

    // Return specific conversation
    if (pageId && CONVERSATIONS[pageId]) {
      const conv = CONVERSATIONS[pageId];
      return NextResponse.json({
        pageId,
        title: conv.name,
        contactName: conv.name,
        phone: conv.phone,
        email: conv.email,
        school: conv.school,
        org: conv.org,
        venmo: conv.venmo,
        status: conv.status,
        messages: conv.messages,
        messageCount: conv.messages.length,
      });
    }

    // Search by contact name
    if (contactName) {
      const entry = Object.entries(CONVERSATIONS).find(([, c]) =>
        c.name.toLowerCase().includes(contactName.toLowerCase())
      );
      if (entry) {
        const [id, conv] = entry;
        return NextResponse.json({
          pageId: id,
          title: conv.name,
          contactName: conv.name,
          messages: conv.messages,
          messageCount: conv.messages.length,
        });
      }
    }

    // Return list of all available conversations
    const conversations = Object.entries(CONVERSATIONS).map(([id, conv]) => {
      const lastMsg = conv.messages.length > 0 ? conv.messages[conv.messages.length - 1].text : '';
      return {
        name: conv.name,
        pageId: id,
        initials: conv.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
        phone: conv.phone,
        school: conv.school,
        org: conv.org,
        status: conv.status,
        messageCount: conv.messages.length,
        lastMessage: lastMsg,
      };
    });

    return NextResponse.json({ conversations });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch conversations';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
