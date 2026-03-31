import { NextResponse } from 'next/server';

type Msg = { id: string; direction: 'outgoing' | 'incoming'; text: string; timestamp: string; aiGenerated: boolean };
type ConvData = { name: string; phone: string; email: string; school: string; org: string; venmo: string; status: string; messages: Msg[] };

// Real conversation data from Notion — FraternityBase Derby Days onboarding (3/25/2026)
const CONVERSATIONS: Record<string, ConvData> = {
  '32e015b8-c2bc-81c4-94d2-f64086f60a52': {
    name: 'Austin Sarvis', phone: '803-203-7946', email: 'austin.sarvis02@gmail.com',
    school: 'UofSC', org: 'Sigma Chi', venmo: 'Austin5922', status: 'Onboarded',
    messages: [
      { id: 'as1', direction: 'outgoing', text: 'Yo Austin whats up man, this is Jackson (I am running that Derby Days sponsor thing for/with Andrew Mims)', timestamp: '3/25 2:30 PM', aiGenerated: false },
      { id: 'as2', direction: 'outgoing', text: 'Saw you filled out the google form, and just wanted to make sure I Venmo you the money of the deposit. What is your Venmo?', timestamp: '3/25 2:30 PM', aiGenerated: false },
      { id: 'as3', direction: 'incoming', text: 'It is austin5922', timestamp: '3/25 2:35 PM', aiGenerated: false },
      { id: 'as4', direction: 'outgoing', text: 'Sending the Venmo in the next few minutes, be on the lookout and lmk when you get it!', timestamp: '3/25 2:40 PM', aiGenerated: false },
      { id: 'as5', direction: 'incoming', text: 'I got it', timestamp: '3/25 2:45 PM', aiGenerated: false },
      { id: 'as6', direction: 'outgoing', text: 'Sent! Let me know if you see it', timestamp: '3/25 2:46 PM', aiGenerated: false },
      { id: 'as7', direction: 'outgoing', text: 'https://ogmarketslimited.pxf.io/hedge', timestamp: '3/25 2:47 PM', aiGenerated: false },
      { id: 'as8', direction: 'outgoing', text: 'and the actual sponsor app is here, go through and you can use the $25 on the March madness games', timestamp: '3/25 2:47 PM', aiGenerated: false },
    ],
  },
  '32e015b8-c2bc-8175-92f8-ecdc4dd06379': {
    name: 'Charles Hickok', phone: '703-203-1376', email: 'charleshickok25@gmail.com',
    school: 'UofSC', org: 'Sigma Chi', venmo: 'Charles-hickok-2', status: 'Awaiting Confirmation',
    messages: [
      { id: 'ch1', direction: 'outgoing', text: 'Yo Charles whats up man, this is Jackson (I am running that Derby Days sponsor thing for/with Andrew Mims)', timestamp: '3/25 2:00 PM', aiGenerated: false },
      { id: 'ch2', direction: 'outgoing', text: 'Saw you filled out the google form, and just wanted to make sure I Venmo you the money of the deposit. What is your Venmo?', timestamp: '3/25 2:00 PM', aiGenerated: false },
      { id: 'ch3', direction: 'incoming', text: "Yo what's good it's Charles-Hickok-2", timestamp: '3/25 2:10 PM', aiGenerated: false },
      { id: 'ch4', direction: 'outgoing', text: 'Sending the Venmo in the next few minutes, be on the lookout and lmk when you get it!', timestamp: '3/25 2:15 PM', aiGenerated: false },
      { id: 'ch5', direction: 'outgoing', text: 'Sent! Let me know if you see it', timestamp: '3/25 2:20 PM', aiGenerated: false },
      { id: 'ch6', direction: 'outgoing', text: 'https://ogmarketslimited.pxf.io/hedge', timestamp: '3/25 2:21 PM', aiGenerated: false },
      { id: 'ch7', direction: 'outgoing', text: 'and the actual sponsor app is here, go through and you can use the $25 on the March madness games', timestamp: '3/25 2:21 PM', aiGenerated: false },
    ],
  },
  '32e015b8-c2bc-81dd-b3f8-ff934878ffc6': {
    name: 'Colby Resh', phone: '443-859-4479', email: 'rcolby06@yahoo.com',
    school: 'UofSC', org: 'Sigma Chi', venmo: 'Colby-resh', status: 'Onboarded',
    messages: [
      { id: 'cr1', direction: 'outgoing', text: 'Yo Colby whats up man, this is Jackson (I am running that Derby Days sponsor thing for/with Andrew Mims)', timestamp: '3/25 1:30 PM', aiGenerated: false },
      { id: 'cr2', direction: 'outgoing', text: 'Saw you filled out the google form, and just wanted to make sure I Venmo you the money of the deposit. What is your Venmo?', timestamp: '3/25 1:30 PM', aiGenerated: false },
      { id: 'cr3', direction: 'incoming', text: "Hey it's Colby-Resh", timestamp: '3/25 1:40 PM', aiGenerated: false },
      { id: 'cr4', direction: 'outgoing', text: 'Sweet, sending in a sec', timestamp: '3/25 1:42 PM', aiGenerated: false },
      { id: 'cr5', direction: 'outgoing', text: 'lmk if you got it! I will drop the link that OG has, and then you can let me know once the deposit and wager are in', timestamp: '3/25 1:45 PM', aiGenerated: false },
      { id: 'cr6', direction: 'incoming', text: 'I got the Venmo', timestamp: '3/25 1:50 PM', aiGenerated: false },
      { id: 'cr7', direction: 'incoming', text: 'Sounds good', timestamp: '3/25 1:50 PM', aiGenerated: false },
      { id: 'cr8', direction: 'outgoing', text: 'here is the link: https://ogmarketslimited.pxf.io/hedge', timestamp: '3/25 1:55 PM', aiGenerated: false },
      { id: 'cr9', direction: 'outgoing', text: 'if there are any issues with it, lmk (verification, deposit issues, etc.)', timestamp: '3/25 1:55 PM', aiGenerated: false },
    ],
  },
  '32e015b8-c2bc-8143-924d-fde1f85cedc1': {
    name: 'Jack Robinson', phone: '401-575-8324', email: 'jackgordonrobinson@gmail.com',
    school: 'UofSC', org: 'Sigma Chi', venmo: '@jackgordonrobinson', status: 'Onboarded',
    messages: [
      { id: 'jr1', direction: 'outgoing', text: 'Yo Jack whats up man, this is Jackson (I am running that Derby Days sponsor thing for/with Andrew Mims)', timestamp: '3/25 1:00 PM', aiGenerated: false },
      { id: 'jr2', direction: 'outgoing', text: 'Saw you filled out the google form, and just wanted to make sure I Venmo you the money of the deposit. What is your Venmo?', timestamp: '3/25 1:00 PM', aiGenerated: false },
      { id: 'jr3', direction: 'incoming', text: "What's this for again, lowkey forgot", timestamp: '3/25 1:15 PM', aiGenerated: false },
      { id: 'jr4', direction: 'outgoing', text: "Oh my bad \u2014 I'm helping Andrew Mims with a sponsorship for Derby Days (the real sponsor is OG + Crypto.com) and the form was for the first 25 guys to get a free deposit on their site. What's your Venmo so I can send it over?", timestamp: '3/25 1:18 PM', aiGenerated: true },
      { id: 'jr5', direction: 'incoming', text: 'Nvm just talked to him my Venmo @jackgordonrobinson', timestamp: '3/25 1:25 PM', aiGenerated: false },
      { id: 'jr6', direction: 'outgoing', text: "Sweet, ill get it over", timestamp: '3/25 1:27 PM', aiGenerated: false },
      { id: 'jr7', direction: 'outgoing', text: 'Sending the Venmo in the next few minutes, be on the lookout and lmk when you get it!', timestamp: '3/25 1:30 PM', aiGenerated: false },
      { id: 'jr8', direction: 'incoming', text: 'Just got it mane appreciate it', timestamp: '3/25 1:40 PM', aiGenerated: false },
      { id: 'jr9', direction: 'outgoing', text: 'Sent! Let me know if you see it', timestamp: '3/25 1:41 PM', aiGenerated: false },
      { id: 'jr10', direction: 'outgoing', text: 'https://ogmarketslimited.pxf.io/hedge', timestamp: '3/25 1:42 PM', aiGenerated: false },
      { id: 'jr11', direction: 'outgoing', text: 'and the actual sponsor app is here, go through and you can use the $25 on the March madness games', timestamp: '3/25 1:42 PM', aiGenerated: false },
    ],
  },
  '32e015b8-c2bc-81a5-88fe-e7adb6ababb2': {
    name: 'Grady Pierce', phone: '803-810-2144', email: 'graydonjpierce@icloud.com',
    school: 'UofSC', org: 'Sigma Chi', venmo: 'Grady-Pierce-3', status: 'Awaiting Confirmation',
    messages: [
      { id: 'gp1', direction: 'outgoing', text: 'Yo Grady whats up man, this is Jackson (I am running that Derby Days sponsor thing for/with Andrew Mims)', timestamp: '3/25 3:00 PM', aiGenerated: false },
      { id: 'gp2', direction: 'outgoing', text: 'Saw you filled out the google form, and just wanted to make sure I Venmo you the money of the deposit. What is your Venmo?', timestamp: '3/25 3:00 PM', aiGenerated: false },
      { id: 'gp3', direction: 'incoming', text: "Yo what's up Jackson, saw the form thought it sounded sweet. My Venmo is Grady-Pierce-3", timestamp: '3/25 3:10 PM', aiGenerated: false },
      { id: 'gp4', direction: 'outgoing', text: 'Sending the Venmo in the next few minutes, be on the lookout and lmk when you get it!', timestamp: '3/25 3:15 PM', aiGenerated: false },
      { id: 'gp5', direction: 'incoming', text: "Perfect. I'll lyk when it comes", timestamp: '3/25 3:18 PM', aiGenerated: false },
      { id: 'gp6', direction: 'outgoing', text: 'Sent! Let me know if you see it', timestamp: '3/25 3:25 PM', aiGenerated: false },
      { id: 'gp7', direction: 'outgoing', text: 'https://ogmarketslimited.pxf.io/hedge', timestamp: '3/25 3:26 PM', aiGenerated: false },
      { id: 'gp8', direction: 'outgoing', text: 'and the actual sponsor app is here, go through and you can use the $25 on the March madness games', timestamp: '3/25 3:26 PM', aiGenerated: false },
    ],
  },
  '32e015b8-c2bc-8118-9bab-dffe695c9155': {
    name: 'Joseph Meyers', phone: '630-642-9352', email: 'meyersjoseph55@gmail.com',
    school: 'UofSC', org: 'Sigma Chi', venmo: 'Joemeyers55', status: 'Onboarded',
    messages: [
      { id: 'jm1', direction: 'outgoing', text: 'Yo Joseph whats up man, this is Jackson (I am running that Derby Days sponsor thing for/with Andrew Mims)', timestamp: '3/25 3:30 PM', aiGenerated: false },
      { id: 'jm2', direction: 'outgoing', text: 'Saw you filled out the google form, and just wanted to make sure I Venmo you the money of the deposit. What is your Venmo?', timestamp: '3/25 3:30 PM', aiGenerated: false },
      { id: 'jm3', direction: 'incoming', text: "What's up my Venmo is Joemeyers55, is there any next steps?", timestamp: '3/25 3:40 PM', aiGenerated: false },
      { id: 'jm4', direction: 'outgoing', text: 'Sending the Venmo in the next few minutes, be on the lookout and lmk when you get it!', timestamp: '3/25 3:45 PM', aiGenerated: false },
      { id: 'jm5', direction: 'incoming', text: 'Just got it thanks', timestamp: '3/25 3:55 PM', aiGenerated: false },
      { id: 'jm6', direction: 'outgoing', text: 'Sent! Let me know if you see it', timestamp: '3/25 3:56 PM', aiGenerated: false },
      { id: 'jm7', direction: 'outgoing', text: 'https://ogmarketslimited.pxf.io/hedge', timestamp: '3/25 3:57 PM', aiGenerated: false },
      { id: 'jm8', direction: 'outgoing', text: 'and the actual sponsor app is here, go through and you can use the $25 on the March madness games', timestamp: '3/25 3:57 PM', aiGenerated: false },
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
    const conversations = Object.entries(CONVERSATIONS).map(([id, conv]) => ({
      name: conv.name,
      pageId: id,
      initials: conv.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
      phone: conv.phone,
      school: conv.school,
      org: conv.org,
      status: conv.status,
      messageCount: conv.messages.length,
    }));

    return NextResponse.json({ conversations });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch conversations';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
