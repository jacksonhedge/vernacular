# Craig Knowledge Base

Drop `.md` files in this folder to teach Craig new things.

Each file becomes part of Craig's system prompt. He reads them
every time someone opens the copilot.

## File naming convention
- `contacts.md` — contact management rules
- `outreach.md` — outreach templates and best practices
- `support.md` — customer support playbooks
- `testing.md` — app testing procedures
- `tone.md` — tone and voice guidelines
- `products.md` — product/service knowledge
- `objections.md` — common objections and responses
- `faqs.md` — frequently asked questions

## How it works
1. Add/edit a `.md` file here
2. Push to GitHub (or edit via dashboard in the future)
3. Craig reads the files on next load via `/api/ai/craig-knowledge`
4. His responses improve based on what you teach him

## Example file (outreach.md)
```markdown
# Outreach Rules

## First Text
- Always introduce yourself by name
- Mention how you found them (Google Form, referral, etc.)
- Keep it under 2 sentences
- End with a question

## Follow-up
- Wait 24-48 hours before following up
- Reference the previous message
- Don't be pushy — one follow-up max

## Templates
### Cold outreach (testing)
"Hey [name]! This is Jackson from [company]. Saw you signed up 
for our testing program. Quick question — are you still interested 
in trying out a new sportsbook app this week?"
```
