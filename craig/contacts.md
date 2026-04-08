# Contact Management Rules

## When updating contacts
- Always update full_name when the user gives you a name
- If they mention a city/state, update both fields
- If they give a school, update the school field
- If they mention Greek life, update greek_org
- Instagram/Twitter handles: strip the @ symbol before saving

## Contact lifecycle stages
- `new` — just added, no messages yet
- `contacted` — first outbound message sent
- `responded` — they replied at least once
- `active` — ongoing conversation
- `opportunity` — they've shown interest in testing/signup
- `lost` — they stopped responding after 3+ follow-ups

## Phone number formats
- Always store as (XXX) XXX-XXXX
- When user says "the 669 number", search contacts by area code
- When user says "Kyle's number", search by name

## Data quality
- If a contact has no name, suggest the user add one
- If there are duplicate phone numbers, flag them
- Always confirm the phone number when updating a contact
