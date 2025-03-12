import { Request } from "express";
import jwt from "jsonwebtoken";

interface JwtPayload {
    id: string;
    [key: string]: any;
}

// Extend Request interface to include user property
interface AuthRequest extends Request {
    user?: JwtPayload;
}


const authMiddleware = (req ,res ,next) => {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    // Extract token from "Bearer <token>"
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
        return res.status(401).json({ error: "Invalid authorization format. Use 'Bearer <token>'." });
    }

    const token = parts[1];

    try {
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not defined");
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;

        (req as AuthRequest).user = decoded;

        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ error: "Invalid token. Please log in again." });
        } else if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ error: "Token expired. Please log in again." });
        } else {
            console.error("Auth middleware error:", error);
            return res.status(500).json({ error: "Authentication failed. Please try again later." });
        }
    }
};

export default authMiddleware;
