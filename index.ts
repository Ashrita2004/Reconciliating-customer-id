import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();

app.use(express.json());

function formatResponse(primary: any, cluster: any[]) {
    
    const allEmails = [primary.email, ...cluster.map(c => c.email)];
    const allPhones = [primary.phoneNumber, ...cluster.map(c => c.phoneNumber)];

    const emails = Array.from(new Set(allEmails)).filter(Boolean);
    const phoneNumbers = Array.from(new Set(allPhones)).filter(Boolean);
    
    // Identify IDs of all secondary contacts in the cluster
    const secondaryContactIds = cluster
        .filter(c => c.id !== primary.id)
        .map(c => c.id);

    return {
        contact: {
            primaryContactId: primary.id, 
            emails,
            phoneNumbers,
            secondaryContactIds
        }
    };
}

app.post('/identify', async (req: Request, res: Response) => {
    try {
        const { email, phoneNumber } = req.body;
        const phoneStr = phoneNumber ? String(phoneNumber) : null;

        if (!email && !phoneStr) {
            return res.status(400).json({ error: "Email or phoneNumber required" });
        }

        // Find initial matches in the database
        const matches = await prisma.contact.findMany({
            where: {
                OR: [
                    { email: email || undefined },
                    { phoneNumber: phoneStr || undefined }
                ]
            }
        });

        // if no existing contact found then a Create new Primary
        if (matches.length === 0) {
            const newContact = await prisma.contact.create({
                data: { email, phoneNumber: phoneStr, linkPrecedence: "primary" }
            });
            return res.status(200).json(formatResponse(newContact, []));
        }

        // We find all possible primary IDs associated with the matches
        const primaryIds = matches.map(m => m.linkedId || m.id);
        
        // Find the absolute oldest contact in this group
        const oldestPrimary = await prisma.contact.findFirst({
            where: { id: { in: primaryIds } },
            orderBy: { createdAt: 'asc' }
        });

        const rootPrimaryId = oldestPrimary!.id;

        // Fetch the entire cluster
        let cluster = await prisma.contact.findMany({
            where: {
                OR: [
                    { id: rootPrimaryId },
                    { linkedId: rootPrimaryId }
                ]
            }
        });

        // If the request links two different clusters, convert the newer primary to secondary
        const otherPrimaries = cluster.filter(c => c.linkPrecedence === "primary" && c.id !== rootPrimaryId);
        
        for (const p of otherPrimaries) {
            await prisma.contact.update({
                where: { id: p.id },
                data: { linkPrecedence: "secondary", linkedId: rootPrimaryId }
            });
            // Updates local cluster state
            p.linkPrecedence = "secondary";
            p.linkedId = rootPrimaryId;
        }

        // Check if we need to create a new Secondary record
        const emailExists = cluster.some(c => c.email === email);
        const phoneExists = cluster.some(c => c.phoneNumber === phoneStr);
        
        if ((email && !emailExists) || (phoneStr && !phoneExists)) {
            const newSecondary = await prisma.contact.create({
                data: { 
                    email, 
                    phoneNumber: phoneStr, 
                    linkedId: rootPrimaryId, 
                    linkPrecedence: "secondary" 
                }
            });
            cluster.push(newSecondary);
        }

        // Sort cluster to ensure the oldest is the first element.
        cluster.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        const primaryContact = cluster.find(c => c.id === rootPrimaryId) || cluster[0];

        res.status(200).json(formatResponse(primaryContact, cluster));

    } catch (error) {
        console.error("Internal Server Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`FluxKart Identity Engine active on port ${PORT}`);
});