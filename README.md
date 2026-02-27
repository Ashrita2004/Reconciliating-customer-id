# FluxKart Identity Reconciliation Service
A backend service designed to unify fragmented customer data. This system ensures that whether a customer uses a new email or a different phone number, their identity is linked to a single Primary record.

### Live Endpoint
**URL:** `https://reconciliating-customer-id.onrender.com/identify`  
**Method:** `POST`

## Technology Stack
- **Runtime:** Node.js
- **Language:** TypeScript
- **Framework:** Express.js
- **Database:** SQLite
- **Deployment:** Render.com

## Live Demo
The service is deployed and active at:
**[https://reconciliating-customer-id.onrender.com](https://reconciliating-customer-id.onrender.com)**

### Sample Request Payload (JSON)
```json
{
  "email": "mcfly@hillvalley.edu",
  "phoneNumber": "123456"
}
```
### Sample Response
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["mcfly@hillvalley.edu", "marty@future.com"],
    "phoneNumbers": ["123456", "987654"],
    "secondaryContactIds": [2, 5]
  }
}
```
