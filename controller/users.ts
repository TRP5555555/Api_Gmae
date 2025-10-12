import express from "express";

export const router = express.Router();

router.get('/', (_req, res) => {
    res.send("GameShop");
});

// export const mockUsers: User[] = [
//   {
//     id: 1,
//     username: "alice123",
//     email: "alice@example.com",
//     password: "hashedpassword1",
//     profile_image: "https://example.com/images/alice.jpg",
//     role: "admin",
//     created_at: new Date("2025-01-10T09:30:00Z"),
//     updated_at: new Date("2025-01-15T12:00:00Z"),
//   },
//   {
//     id: 2,
//     username: "bobdev",
//     email: "bob@example.com",
//     password: "hashedpassword2",
//     profile_image: "https://example.com/images/bob.png",
//     role: "user",
//     created_at: new Date("2025-02-05T11:45:00Z"),
//     updated_at: new Date("2025-02-06T08:15:00Z"),
//   },
//   {
//     id: 3,
//     username: "charlie99",
//     email: "charlie@example.com",
//     password: "hashedpassword3",
//     profile_image: "https://example.com/images/charlie.jpg",
//     role: "moderator",
//     created_at: new Date("2025-03-12T14:20:00Z"),
//     updated_at: new Date("2025-03-13T09:10:00Z"),
//   }
// ];