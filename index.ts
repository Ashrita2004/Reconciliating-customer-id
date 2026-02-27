import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();

app.use(express.json());
app.use(express.static('public'));


app.post('/identify', async (req: Request, res: Response) => {
    const { email, phoneNumber } = req.body;
    const phoneStr = phoneNumber ? String(phoneNumber) : null;

    // it finds existing matches
    const matches = await prisma.contact.findMany({
        where: {
            OR: [
                { email: email || undefined },
                { phoneNumber: phoneStr || undefined }
            ]
        }
    });

    //  Creates new Primary when no match found
    if (matches.length === 0) {
        const newContact = await prisma.contact.create({
            data: { email, phoneNumber: phoneStr, linkPrecedence: "primary" }
        });
        return res.status(200).json(formatResponse(newContact, []));
    }

    //  Finds all related contacts in the cluster when a match found
    const allPrimaryIds = new Set(matches.map(m => m.linkedId || m.id));
    let cluster = await prisma.contact.findMany({
        where: {
            OR: [
                { id: { in: Array.from(allPrimaryIds) } },
                { linkedId: { in: Array.from(allPrimaryIds) } }
            ]
        }
    });

    cluster.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const primaryContact = cluster[0];

    // If two primaries now link, make the newer one secondary which helps in handling merging
    const otherPrimaries = cluster.filter(c => c.linkPrecedence === "primary" && c.id !== primaryContact.id);
    for (const p of otherPrimaries) {
        await prisma.contact.update({
            where: { id: p.id },
            data: { linkPrecedence: "secondary", linkedId: primaryContact.id }
        });
        p.linkPrecedence = "secondary";
        p.linkedId = primaryContact.id;
    }

    //  Creates Secondary if email/phone is new to this user
    const emailExists = cluster.some(c => c.email === email);
    const phoneExists = cluster.some(c => c.phoneNumber === phoneStr);
    if ((email && !emailExists) || (phoneStr && !phoneExists)) {
        const newSecondary = await prisma.contact.create({
            data: { email, phoneNumber: phoneStr, linkedId: primaryContact.id, linkPrecedence: "secondary" }
        });
        cluster.push(newSecondary);
    }

    res.status(200).json(formatResponse(primaryContact, cluster));
});

function formatResponse(primary: any, all: any[]) {
    const emails = Array.from(new Set([primary.email, ...all.map(c => c.email)])).filter(Boolean);
    const phones = Array.from(new Set([primary.phoneNumber, ...all.map(c => c.phoneNumber)])).filter(Boolean);
    const secondaryIds = all.filter(c => c.id !== primary.id).map(c => c.id);

    return {
        contact: {
            primaryContactId: primary.id,
            emails,
            phoneNumbers: phones,
            secondaryContactIds: secondaryIds
        }
    };
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`FluxCart Identity Engine active on port ${PORT}`);
});