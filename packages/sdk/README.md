# @vernacular/sdk

TypeScript SDK for the [Vernacular](https://vernacular.chat) iMessage CRM API.

Works on any platform: Node.js 18+, Electron, React Native, or any environment with a global `fetch()`.

## Installation

```bash
npm install @vernacular/sdk
```

## Quick Start

```ts
import { VernacularClient } from '@vernacular/sdk';

const client = new VernacularClient({
  apiUrl: 'https://vernacular.chat',
  apiKey: 'your-api-key',
  orgId: 'your-org-id',
});

// Send a message
await client.send({
  to: '+14125551234',
  message: 'Hello from Vernacular!',
});
```

## Usage

### Send a Message

```ts
const result = await client.send({
  to: '+14125551234',
  message: 'Hey, following up on our conversation.',
  contactName: 'Jane Doe',      // optional
  sourceSystem: 'my-crm',       // optional, defaults to "sdk"
});

console.log(result.success);     // true
console.log(result.messageId);   // "msg_abc123"
```

### Send a Test Message

```ts
await client.sendTest({
  phoneNumber: '+14125551234',
  message: 'Test from SDK',      // optional
});
```

### List Conversations

```ts
const conversations = await client.getConversations();
conversations.forEach(c => {
  console.log(c.contact?.displayName, c.lastMessageAt);
});
```

### Contacts

```ts
// Search contacts
const contacts = await client.getContacts('Jane');

// Create a contact
const newContact = await client.createContact({
  phone: '+14125551234',
  displayName: 'Jane Doe',
  tags: ['vip', 'investor'],
});
```

### Listen for Inbound Messages

```ts
// Poll every 30 seconds (default) and handle new messages
const stop = client.onInbound((messages) => {
  messages.forEach(m => {
    console.log(`${m.from}: ${m.body}`);
  });
});

// Stop polling when done
stop();
```

### Station Heartbeat

```ts
// Send a heartbeat from a station
await client.heartbeat('station-01');
```

### Phone Number Utilities

```ts
import { normalize10, formatPhone, phoneSearchVariants } from '@vernacular/sdk';

normalize10('+1 (412) 555-1234');  // "4125551234"
formatPhone('4125551234');          // "(412) 555-1234"
phoneSearchVariants('4125551234');  // all format variants for matching
```

## Node.js

Works out of the box with Node.js 18+ (global `fetch` is available).

```ts
import { VernacularClient } from '@vernacular/sdk';

const client = new VernacularClient({
  apiUrl: process.env.VERNACULAR_API_URL!,
  apiKey: process.env.VERNACULAR_API_KEY!,
  orgId: process.env.VERNACULAR_ORG_ID!,
});
```

## Electron

Works in both the main process and renderer process.

```ts
// main.ts
import { VernacularClient } from '@vernacular/sdk';

const client = new VernacularClient({
  apiUrl: 'https://vernacular.chat',
  apiKey: store.get('apiKey'),
  orgId: store.get('orgId'),
});

// Listen for inbound in the main process
client.onInbound((messages) => {
  mainWindow.webContents.send('new-messages', messages);
});
```

## React Native

Works with React Native's built-in `fetch`.

```ts
import { VernacularClient } from '@vernacular/sdk';

const client = new VernacularClient({
  apiUrl: 'https://vernacular.chat',
  apiKey: Config.VERNACULAR_API_KEY,
  orgId: Config.VERNACULAR_ORG_ID,
});

// In a React component
const [conversations, setConversations] = useState([]);

useEffect(() => {
  client.getConversations().then(setConversations);
}, []);
```

## Cleanup

Always call `destroy()` when you are done with the client to stop any active polling timers.

```ts
client.destroy();
```

## License

MIT
