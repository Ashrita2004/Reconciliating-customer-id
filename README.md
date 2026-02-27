FluxKart Identity Reconciliation Service
A backend service designed to unify fragmented customer data. This system ensures that whether a customer uses a new email or a different phone number, their identity is linked to a single Primary record.

Live API Endpoint
URL: https://reconciliating-customer-id.onrender.com/identify

Tech Stack
Runtime: Node.js (v22)
Language: TypeScript
Framework: Express.js
Database: SQLite 
Deployment: Render.com

Sample Request Payload
{
  "email": "mcfly@hillvalley.edu",
  "phoneNumber": "123456"
}
Sample Response
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["mcfly@hillvalley.edu", "marty@future.com"],
    "phoneNumbers": ["123456", "987654"],
    "secondaryContactIds": [2, 5]
  }
}
