import { Db, ObjectId } from "mongodb";
import { database } from "../database/Database";
import { AuthService } from "../service/AuthService";
import { Constant } from "../util/Constant";
import { Action, Resource } from "../util/Enum";
import { ForbiddenError } from "../util/Error";

// Định nghĩa enum cho groupBy options
export enum GroupByOption {
  DAY = "day",
  WEEK = "week",
  MONTH = "month",
  YEAR = "year",
}

// Interface cho query params
export interface StatisticQueryParams {
  from?: string;
  to?: string;
  groupBy?: GroupByOption;
}

export class StatisticRepository {
  private database: Db;
  private authService: AuthService;

  // Add this constant at class level
  private groupByFormats: Record<GroupByOption, string> = {
    [GroupByOption.DAY]: "%Y-%m-%d",
    [GroupByOption.WEEK]: "%Y-W%V",
    [GroupByOption.MONTH]: "%Y-%m",
    [GroupByOption.YEAR]: "%Y",
  };

  constructor(private userId: string) {
    this.database = database;
    this.authService = new AuthService(this.database, this.userId);
  }

  private async checkPermission() {
    const hasPermission = await this.authService.hasPermission(
      Resource.STATISTIC,
      Action.READ
    );
    if (!hasPermission) {
      throw new ForbiddenError("You don't have permission to view statistics");
    }
  }

  private getDateFilter(query?: StatisticQueryParams) {
    const filter: Record<string, any> = {};

    if (query?.from || query?.to) {
      filter.createdAt = {};
      if (query.from) {
        filter.createdAt.$gte = new Date(query.from);
      }
      if (query.to) {
        filter.createdAt.$lte = new Date(query.to);
      }
    }

    return filter;
  }

  async getGeneralStatistics(query?: StatisticQueryParams) {
    await this.checkPermission();

    const dateFilter = this.getDateFilter(query);
    const pipeline: any[] = [];

    // Thêm match stage đầu tiên
    if (Object.keys(dateFilter).length > 0) {
      pipeline.push({ $match: dateFilter });
    }

    // Thêm group stage
    if (query?.groupBy) {
      pipeline.push(
        {
          $group: {
            _id: {
              date: {
                $dateToString: {
                  format: this.groupByFormats[query.groupBy],
                  date: "$createdAt",
                },
              },
            },
            totalUsers: { $sum: 1 },
            totalPremiumFictions: {
              $sum: { $cond: [{ $eq: ["$type", "premium"] }, 1, 0] },
            },
            totalFreeFictions: {
              $sum: { $cond: [{ $eq: ["$type", "free"] }, 1, 0] },
            },
            totalViews: { $sum: "$stats.viewCount" },
          },
        },
        {
          $sort: { "_id.date": 1 },
        }
      );
    } else {
      pipeline.push({
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          totalPremiumFictions: {
            $sum: { $cond: [{ $eq: ["$type", "premium"] }, 1, 0] },
          },
          totalFreeFictions: {
            $sum: { $cond: [{ $eq: ["$type", "free"] }, 1, 0] },
          },
          totalViews: { $sum: "$stats.viewCount" },
        },
      });
    }

    const [totalUsers, totalAuthors, fictionStats, revenueStats] =
      await Promise.all([
        this.database.collection(Constant.USER_COLLECTION).countDocuments(),
        this.database.collection(Constant.USER_COLLECTION).countDocuments({
          authorApplicationStatus: "approved",
        }),
        this.database
          .collection(Constant.FICTION_COLLECTION)
          .aggregate(pipeline)
          .toArray(),
        this.database
          .collection(Constant.TRANSACTION_COLLECTION)
          .aggregate([
            { $match: dateFilter },
            {
              $addFields: {
                numericAmount: { $toDouble: "$amount" },
              },
            },
            {
              $group: {
                _id: query?.groupBy
                  ? {
                      date: {
                        $dateToString: {
                          format: this.groupByFormats[query.groupBy],
                          date: "$createdAt",
                        },
                      },
                    }
                  : null,
                totalRevenue: {
                  $sum: {
                    $cond: [
                      { $eq: ["$status", "success"] },
                      "$numericAmount",
                      0,
                    ],
                  },
                },
                totalPaidOut: {
                  $sum: {
                    $cond: [
                      { $eq: ["$type", "author_payout"] },
                      "$numericAmount",
                      0,
                    ],
                  },
                },
              },
            },
            {
              $sort: query?.groupBy ? { "_id.date": 1 } : { _id: 1 },
            },
          ])
          .toArray(),
      ]);

    if (query?.groupBy) {
      return fictionStats.map((stat: any) => ({
        date: stat._id.date,
        totalUsers,
        totalAuthors,
        totalFictions: stat.totalPremiumFictions + stat.totalFreeFictions,
        totalPremiumFictions: stat.totalPremiumFictions,
        totalFreeFictions: stat.totalFreeFictions,
        totalViews: stat.totalViews,
        totalRevenue:
          revenueStats.find((r: any) => r._id?.date === stat._id.date)
            ?.totalRevenue || 0,
        totalPaidOut:
          revenueStats.find((r: any) => r._id?.date === stat._id.date)
            ?.totalPaidOut || 0,
      }));
    }

    return {
      totalUsers,
      totalAuthors,
      totalFictions:
        fictionStats[0]?.totalPremiumFictions +
          fictionStats[0]?.totalFreeFictions || 0,
      totalPremiumFictions: fictionStats[0]?.totalPremiumFictions || 0,
      totalFreeFictions: fictionStats[0]?.totalFreeFictions || 0,
      totalViews: fictionStats[0]?.totalViews || 0,
      totalRevenue: revenueStats[0]?.totalRevenue || 0,
      totalPaidOut: revenueStats[0]?.totalPaidOut || 0,
    };
  }

  async getFictionStatistics(query?: StatisticQueryParams) {
    await this.checkPermission();
    const dateFilter = this.getDateFilter(query);

    const [basicStats, topViewed] = await Promise.all([
      // Thống kê cơ bản
      this.database
        .collection(Constant.FICTION_COLLECTION)
        .aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: null,
              totalViews: { $sum: "$stats.viewCount" },
              totalFavorites: { $sum: "$stats.favoriteCount" },
              totalComments: { $sum: "$stats.commentCount" },
              totalRatings: { $sum: "$stats.ratingCount" },
              averageRating: { $avg: "$stats.averageRating" },
              viewsByType: {
                $push: {
                  type: "$type",
                  views: "$stats.viewCount",
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              totalViews: 1,
              totalFavorites: 1,
              totalComments: 1,
              totalRatings: 1,
              averageRating: 1,
              viewsByType: {
                $reduce: {
                  input: "$viewsByType",
                  initialValue: { free: 0, premium: 0 },
                  in: {
                    free: {
                      $add: [
                        "$$value.free",
                        {
                          $cond: [
                            { $eq: ["$$this.type", "free"] },
                            "$$this.views",
                            0,
                          ],
                        },
                      ],
                    },
                    premium: {
                      $add: [
                        "$$value.premium",
                        {
                          $cond: [
                            { $eq: ["$$this.type", "premium"] },
                            "$$this.views",
                            0,
                          ],
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        ])
        .toArray(),

      // Top truyện được xem nhiều nhất
      this.database
        .collection(Constant.FICTION_COLLECTION)
        .aggregate([
          { $match: dateFilter },
          {
            $sort: { "stats.viewCount": -1 },
          },
          {
            $limit: 10,
          },
          {
            $project: {
              _id: 1,
              title: 1,
              views: "$stats.viewCount",
            },
          },
        ])
        .toArray(),
    ]);

    const totalComments = await this.database
      .collection(Constant.COMMENT_COLLECTION)
      .countDocuments(dateFilter);

    return {
      ...basicStats[0],
      totalComments,
      topViewedFictions: topViewed,
    };
  }

  async getUserStatistics(query?: StatisticQueryParams) {
    await this.checkPermission();
    const dateFilter = this.getDateFilter(query);

    const [userStats, roleDistribution] = await Promise.all([
      // Thống kê cơ bản về người dùng
      this.database
        .collection(Constant.USER_COLLECTION)
        .aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: null,
              totalUsers: { $sum: 1 },
              premiumUsers: {
                $sum: { $cond: [{ $eq: ["$isPremium", true] }, 1, 0] },
              },
              newUsersCount: {
                $sum: {
                  $cond: [
                    {
                      $gte: [
                        "$createdAt",
                        new Date(
                          new Date().getTime() - 30 * 24 * 60 * 60 * 1000
                        ),
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ])
        .toArray(),

      // Phân bố người dùng theo role
      this.database
        .collection(Constant.USER_COLLECTION)
        .aggregate([
          { $match: dateFilter },
          {
            $lookup: {
              from: Constant.ROLE_COLLECTION,
              localField: "role",
              foreignField: "_id",
              as: "roleInfo",
            },
          },
          {
            $unwind: "$roleInfo",
          },
          {
            $group: {
              _id: "$roleInfo.name",
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              role: "$_id",
              count: 1,
            },
          },
        ])
        .toArray(),
    ]);

    // Chuyển đổi phân bố role thành object
    const usersByRole = roleDistribution.reduce((acc: any, curr) => {
      acc[curr.role] = curr.count;
      return acc;
    }, {});

    return {
      ...userStats[0],
      usersByRole,
    };
  }
}
