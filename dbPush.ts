import { config } from "dotenv"
import { resolve } from "path"
config({
	path: resolve(process.cwd(), `${process.env.NODE_ENV}.env`)
})

import {
	PrismaClient,
	CricketContestParticipationStaus,
	CricketMatchStatus,
	CricketContest,
	Prisma,
	TransactionType
} from "@prisma/client"
import prismaInstance from "./src/v1/setup/prismaClient"

import { createClient } from "redis"
import appConfig from "./src/v1/config"

const url = process.env.REDIS_URL
export const publisher = createClient({ url })
;(async () => {
	publisher.on("connect", async () => {})

	await publisher.connect()
})()

let prismaDbPusher = new PrismaClient({
	errorFormat: "minimal",
	log:
		process.env.NODE_ENV! !== "production"
			? [
					{
						emit: "event",
						level: "query"
					},
					{
						emit: "event",
						level: "error"
					}
			  ]
			: [
					{
						emit: "event",
						level: "error"
					}
			  ]
})

const createMatchContest = async () => {
	const data = {
		data: {
			contestCreateData: {
				entryFee: 109,
				totalSpots: 10000,
				filledSpots: 7090,
				maxTeamsAllowed: 17,
				pricePool: 900000,
				serviceCharge: 5,
				serviceChargeType: "PERCENTAGE",
				contestTypeId: 4,
				status: "not processed",
				matchId: 17709
			},
			contestDistributionRules: [
				{
					fromRank: 1,
					toRank: 1,
					amount: 50000
				},
				{
					fromRank: 2,
					toRank: 2,
					amount: 40000
				},
				{
					fromRank: 3,
					toRank: 3,
					amount: 30000
				},
				{
					fromRank: 4,
					toRank: 5,
					amount: 20000
				},
				{
					fromRank: 6,
					toRank: 2000,
					amount: 10000
				}
			]
		}
	}

	const createData = [
		{
			entryFee: 109,
			totalSpots: 10000,
			filledSpots: 7090,
			maxTeamsAllowed: 17,
			pricePool: 900000,
			serviceCharge: 5,
			serviceChargeType: "PERCENTAGE",
			contestTypeId: 4,
			status: "not processed",
			matchId: 17709
		}
	]

	// prismaDbPusher.cricketContest.createMany({
	// 	data: {}
	// })
}

const updateParticipations = async () => {
	const matchId = 58822
	// 58822 - 1st
	// 58803 - 2nd
	// 58811 - 3rd

	await prismaDbPusher.cricketContestParticipation.updateMany({
		where: {
			matchId: 58803
		},
		data: {
			status: CricketContestParticipationStaus.SETTELED
		}
	})

	// await prismaDbPusher.cricketContest.updateMany({
	// 	where: {
	// 		matchId: 18438
	// 	},
	// 	data: {
	// 		matchId: matchId
	// 	}
	// })

	console.log("contest and participations updated successfully")
}

const assignBiggestContest = async () => {
	const allMatches = await prismaInstance.cricketMatch.findMany({
		where: {
			biggestContestId: null
		}
	})

	const allContest = await Promise.all(
		allMatches.map((match) => {
			return prismaInstance.cricketContest.findMany({
				where: {
					matchId: match.id
				},
				select: {
					firstPrizeRule: {
						select: {
							amount: true
						}
					}
				}
			})
		})
	)

	allContest.map((contest) => {
		contest.sort((a, b) => {
			if (a.firstPrizeRule && b.firstPrizeRule)
				return a.firstPrizeRule?.amount - b.firstPrizeRule?.amount
			return 0
		})
	})
}

// mark the match its contest its participations as complete
const markMatchContestAndParticipationAsDone = async (matchId: number) => {
	const [_match, { count: contestCount }, { count: participationsCount }] =
		await Promise.all([
			prismaDbPusher.cricketMatch.update({
				where: {
					id: matchId
				},
				data: {
					status: CricketMatchStatus.SETTELED
				}
			}),
			prismaDbPusher.cricketContest.updateMany({
				where: {
					matchId: matchId
				},
				data: {
					status: CricketMatchStatus.SETTELED
				}
			}),
			prismaDbPusher.cricketContestParticipation.updateMany({
				where: {
					matchId: matchId
				},
				data: {
					status: CricketContestParticipationStaus.SETTELED
				}
			})
		])

	console.log("Contest updated : ", contestCount)
	console.log("Participation updated : ", participationsCount)
}

const addKycRecordForAllTheUsers = async () => {
	console.log(`creating`)
	const allUsers = await prismaDbPusher.user.findMany({
		select: { id: true }
	})

	await Promise.all(
		allUsers.map((user) => {
			return prismaDbPusher.userKYCRecord.create({
				data: {
					id: user.id
				}
			})
		})
	).then((records) => {
		console.log(`created ${records.length} kyc records`)
	})
}

// addKycRecordForAllTheUsers()

const prismaRaw = async () => {
	try {
		// const queryString = `SELECT * FROM cricket_contest_participation WHERE contestId=162 ORDER BY points DESC LIMIT 50`
		const result =
			await prismaInstance.$queryRaw`SELECT * FROM cricket_contest_participation WHERE contest_id=162 ORDER BY points DESC LIMIT 50`
		console.log(result)
	} catch (error) {
		console.log(error)
	}
}

const createManyContestTypes = async () => {
	const contestNames = [
		"MEGA",
		"1 vs 1",
		"Winer Takes ALL",
		"2X Reward",
		"10X Reward"
	]
	const createdContests = await prismaDbPusher.cricketContestType.createMany({
		data: contestNames.map((name) => {
			return {
				titleCoded: name,
				titleVerbose: name
			}
		})
	})

	console.log(` create ${createdContests.count} contest types`)
}

// setupFreshRankingEnv()
// createManyContestTypes()
// fetchAndCreateMatches()

const createNewuser = async () => {
	const user = await prismaInstance.user.create({
		data: {
			phoneNumber: "6353671720",
			countryCode: "91",
			email: "rohitkumar9133@gmail.com",
			userType: "BETTER",
			isActive: true,
			isTempUser: false,
			referralCode: "1234567890123456"
		}
	})

	console.log(`created new user ${user.id}`)
}

const scheduleAllMatches = async () => {
	const { count } = await prismaInstance.cricketMatch.updateMany({
		where: {
			status: {
				in: ["COMPLETED", "SCHEDULED"]
			}
		},
		data: {
			status: CricketMatchStatus.SCHEDULED
		}
	})

	console.log(`scheduled ${count} matches`)
}

const testinFunc = async () => {
	// do the db ranking of all the participations current contest
	const contestId = 6
	const rankResults =
		(await prismaInstance.$queryRaw`SELECT id, rank() OVER ( ORDER BY points DESC) rank_number FROM public.cricket_contest_participation where "contestId"=${contestId}`) as {
			id: number
			rank_number: bigint
		}[]

	console.log(rankResults)

	// const onRankIterator = {
	// 	[Symbol.asyncIterator]: () => {
	// 		let start = 0
	// 		const { COMPLETED_MATCHES } =
	// 			appConfig.appWorkingConfigs.AFTER_MATCH_JOB.PER_PAGE
	// 		let end = COMPLETED_MATCHES
	// 		return {
	// 			next: async () => {
	// 				await Promise.all(
	// 					rankResults
	// 						.slice(start, Math.min(end, rankResults.length) + 1)
	// 						.map((rank) => {
	// 							return prismaInstance.cricketContestParticipation.update(
	// 								{
	// 									where: {
	// 										id: rank.id
	// 									},
	// 									data: {
	// 										rank: Number(rank.rank_number)
	// 									}
	// 								}
	// 							)
	// 						})
	// 				)
	// 				start += COMPLETED_MATCHES
	// 				end += COMPLETED_MATCHES
	// 				return {
	// 					value: {
	// 						start: start - COMPLETED_MATCHES,
	// 						end: Math.min(
	// 							end - COMPLETED_MATCHES,
	// 							rankResults.length
	// 						)
	// 					},
	// 					done: end - COMPLETED_MATCHES >= rankResults.length
	// 				}
	// 			}
	// 		}
	// 	}
	// }

	// for await (const rankRange of onRankIterator) {
	// 	console.log(
	// 		`Ranking contest ${6} => from:${rankRange.start} end:${
	// 			rankRange.end
	// 		}`
	// 	)
	// }

	// const groupedRankMap =
	// 	await prismaInstance.cricketContestParticipation.groupBy({
	// 		by: ["rank"],
	// 		where: {
	// 			contestId: 6
	// 		},
	// 		_count: {
	// 			rank: true
	// 		},
	// 		orderBy: {
	// 			rank: "asc"
	// 		}
	// 	})

	// const newGroupedRankMap: Record<number, number> = {}
	// groupedRankMap.forEach((item) => {
	// 	newGroupedRankMap[item.rank!] = item._count.rank
	// })

	// [].filter((item) => {
	// 	return item._count.rank !== 1
	// })
	// .map((item) => {
	// 	return {
	// 		rank: item.rank,
	// 		count: item._count.rank
	// 	}
	// })

	// console.log("groupedRankMap : ", newGroupedRankMap)
}

const removeParticipations = async () => {
	// const { count } =
	// 	await prismaInstance.cricketContestParticipation.deleteMany({
	// 		where: {
	// 			id: {
	// 				gt: 1500
	// 			}
	// 		}
	// 	})
	// console.log(`Deleted ${count} items`)
}

export const assignFirstPrizeRules = async () => {
	// ROHIT
	const contestsIterator = {
		[Symbol.asyncIterator]: () => {
			let cursor: null | number = null
			return {
				next: async () => {
					const contests =
						await prismaInstance.cricketContest.findMany({
							where: {
								firstPrizeRuleId: null
							},
							cursor: cursor
								? {
										id: cursor
								  }
								: undefined,
							take: 500,
							orderBy: {
								id: "asc"
							},
							select: {
								id: true,
								contestDistributionRules: true
							}
						})

					const updatePrs: Prisma.CricketContestUpdateArgs[] = []

					contests.forEach((contest) => {
						const { contestDistributionRules } = contest

						const firstPrizeRule = contestDistributionRules.find(
							(rule) => rule.fromRank === 1
						)

						updatePrs.push({
							where: {
								id: contest.id
							},
							data: {
								firstPrizeRuleId: firstPrizeRule?.id
							},
							select: { id: true }
						})
					})

					const updatedContests = await Promise.all(
						updatePrs.map((args) =>
							prismaInstance.cricketContest.update(args)
						)
					)

					console.log(`updated ${updatedContests.length} contets`)

					cursor = contests[contests.length - 1]?.id

					return {
						value: null,
						done: contests.length === 0 || contests.length < 500
					}
				}
			}
		}
	}

	for await (const iterator of contestsIterator) {
	}
}

const loadPreviousMatchesData = async () => {}

const allScheduledMatchplayers = async () => {
	const allScheduledMatches = await prismaInstance.cricketMatch.findMany({
		where: {
			startTime: {
				gte: new Date(Date.now() - 1000 * 60 * 60 * 3)
			}
		}
	})
}

const dbPushCallStack = () => {
	// setupFreshRankingEnv()
	// scheduleAllMatches()
	// createManyContestTypes()
	// fetchAndCreateMatches()
	// addKycRecordForAllTheUsers()
	// assignBiggestContest()
	// createNewuser()
	// afterDbReset()
	// assignFirstPrizeRules()
	// createMatchContest()
	// updateParticipations()
	// deleteAllMatchAndRelatedRecords()
	// updateImagesOfPlayers()
}
dbPushCallStack()
