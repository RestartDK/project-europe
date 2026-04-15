import { query } from "./_generated/server"

export const get = query({
  handler: async () => {
    return {
      message: "Convex is connected to your React app.",
      environment: "local",
    }
  },
})
