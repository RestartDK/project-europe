import { v } from "convex/values"

import { action } from "./_generated/server"

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql"

const contributionDayValidator = v.object({
  date: v.string(),
  contributionCount: v.number(),
  level: v.number(),
})

const contributionCalendarValidator = v.object({
  username: v.string(),
  totalContributions: v.number(),
  weeks: v.array(v.array(contributionDayValidator)),
})

type GitHubContributionLevel =
  | "NONE"
  | "FIRST_QUARTILE"
  | "SECOND_QUARTILE"
  | "THIRD_QUARTILE"
  | "FOURTH_QUARTILE"

type GitHubCalendarResponse = {
  data?: {
    user: {
      login: string
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: number
          weeks: Array<{
            contributionDays: Array<{
              date: string
              contributionCount: number
              contributionLevel: GitHubContributionLevel
            }>
          }>
        }
      }
    } | null
  }
  errors?: Array<{ message: string }>
}

const levelMap: Record<GitHubContributionLevel, number> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
}

export const getContributionCalendar = action({
  args: {
    username: v.string(),
  },
  returns: v.union(contributionCalendarValidator, v.null()),
  handler: async (_ctx, args) => {
    const token = process.env.GITHUB_TOKEN
    if (!token) {
      throw new Error("GITHUB_TOKEN environment variable is not set")
    }

    const username = args.username.trim()
    if (!username) {
      return null
    }

    const to = new Date()
    const from = new Date(to)
    from.setFullYear(from.getFullYear() - 1)

    const response = await fetch(GITHUB_GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          query UserContributions($login: String!, $from: DateTime!, $to: DateTime!) {
            user(login: $login) {
              login
              contributionsCollection(from: $from, to: $to) {
                contributionCalendar {
                  totalContributions
                  weeks {
                    contributionDays {
                      date
                      contributionCount
                      contributionLevel
                    }
                  }
                }
              }
            }
          }
        `,
        variables: {
          login: username,
          from: from.toISOString(),
          to: to.toISOString(),
        },
      }),
    })

    const payload = (await response.json()) as GitHubCalendarResponse

    if (!response.ok) {
      const detail = payload.errors?.map((error) => error.message).join("; ")
      throw new Error(
        detail
          ? `GitHub API error: ${detail}`
          : `GitHub API error: ${response.status}`
      )
    }

    if (payload.errors?.length) {
      throw new Error(payload.errors.map((error) => error.message).join("; "))
    }

    if (!payload.data?.user) {
      return null
    }

    const calendar =
      payload.data.user.contributionsCollection.contributionCalendar

    return {
      username: payload.data.user.login,
      totalContributions: calendar.totalContributions,
      weeks: calendar.weeks.map((week) =>
        week.contributionDays.map((day) => ({
          date: day.date,
          contributionCount: day.contributionCount,
          level: levelMap[day.contributionLevel],
        }))
      ),
    }
  },
})
