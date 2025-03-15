import "next-auth";

declare module "next-auth" {
    interface Session {
        accessToken?: string; // Add this to extend session type
        user: {
            id: string;
            username?: string;
            name?: string;
            email?: string;
        };
    }
}
