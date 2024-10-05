import { Db, ObjectId } from "mongodb";
import { database } from "../database/Database";
import { Constant } from "../util/Constant";
import { Fiction, Rating, Comment } from "../model/Entity";
import { NotFoundError } from "elysia";

export class InteractionRepository {
  private database: Db;

  constructor(private userId: string) {
    this.database = database;
  }
  async deleteCommentRate(commentId: string) {
    const result = await this.database
      .collection<Comment>(Constant.COMMENT_COLLECTION)
      .updateOne(
        { _id: new ObjectId(commentId) },
        {
          $pull: {
            likes: new ObjectId(this.userId),
            dislikes: new ObjectId(this.userId),
          },
        }
      );

    if (!result.acknowledged) throw new Error("Failed to delete comment rate");
  }

  async getRating(fictionId: string): Promise<Rating | null> {
    const rating = await this.database
      .collection<Rating>(Constant.RATING_COLLECTION)
      .findOne({
        fiction: new ObjectId(fictionId),
        user: new ObjectId(this.userId),
      });

    return rating;
  }
  async rateFiction(fictionId: string, score: number) {
    const fiction = await this.database
      .collection<Fiction>(Constant.FICTION_COLLECTION)
      .findOne({ _id: new ObjectId(fictionId) });

    if (!fiction) throw new NotFoundError("Fiction not found");

    const existingRating = await this.database
      .collection<Rating>(Constant.RATING_COLLECTION)
      .findOne({
        fiction: new ObjectId(fictionId),
        user: new ObjectId(this.userId),
      });

    if (existingRating) {
      const updatedRating = await this.database
        .collection<Rating>(Constant.RATING_COLLECTION)
        .findOneAndUpdate(
          { _id: existingRating._id },
          { $set: { score, updatedAt: new Date() } },
          { returnDocument: "after" }
        );

      if (!updatedRating) throw new Error("Failed to update rating");

      await this.updateFictionRating(fictionId);
      return updatedRating;
    } else {
      const newRating: Rating = {
        fiction: new ObjectId(fictionId),
        user: new ObjectId(this.userId),
        score: score,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await this.database
        .collection<Rating>(Constant.RATING_COLLECTION)
        .insertOne(newRating);

      if (!result.acknowledged) throw new Error("Failed to add rating");

      await this.updateFictionRating(fictionId);

      return newRating;
    }
  }

  private async updateFictionRating(fictionId: string): Promise<void> {
    const ratings = await this.database
      .collection<Rating>(Constant.RATING_COLLECTION)
      .find({ fiction: new ObjectId(fictionId) })
      .toArray();

    const totalRating = ratings.reduce((sum, rating) => sum + rating.score, 0);
    const averageRating = totalRating / ratings.length;

    await this.database
      .collection<Fiction>(Constant.FICTION_COLLECTION)
      .updateOne(
        { _id: new ObjectId(fictionId) },
        {
          $set: {
            "stats.averageRating": averageRating,
            "stats.ratingCount": ratings.length,
          },
        }
      );
  }

  async getComments(
    fictionId: string,
    params: { page?: number; limit?: number }
  ): Promise<{ comments: Comment[]; total: number }> {
    const { page = 1, limit = 10 } = params;
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.database
        .collection<Comment>(Constant.COMMENT_COLLECTION)
        .aggregate([
          { $match: { fiction: new ObjectId(fictionId) } },
          {
            $lookup: {
              from: Constant.USER_COLLECTION,
              localField: "user",
              foreignField: "_id",
              as: "user",
            },
          },
          { $unwind: "$user" },
          {
            $project: {
              _id: 1,
              content: 1,
              likes: 1,
              dislikes: 1,
              createdAt: 1,
              updatedAt: 1,
              userId: "$user._id",
              user: 1,
            },
          },
        ])
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.database
        .collection<Comment>(Constant.COMMENT_COLLECTION)
        .countDocuments({ fiction: new ObjectId(fictionId) }),
    ]);

    return { comments: comments as Comment[], total };
  }

  async addComment(
    fictionId: string,
    commentData: { content: string }
  ): Promise<Comment> {
    const newComment: Comment = {
      fiction: new ObjectId(fictionId),
      user: new ObjectId(this.userId),
      content: commentData.content,
      likes: [],
      dislikes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.database
      .collection<Comment>(Constant.COMMENT_COLLECTION)
      .insertOne(newComment);

    if (!result.acknowledged) throw new Error("Failed to add comment");

    await this.database
      .collection<Fiction>(Constant.FICTION_COLLECTION)
      .updateOne(
        { _id: new ObjectId(fictionId) },
        { $inc: { "stats.commentCount": 1 } }
      );

    return newComment;
  }

  async updateComment(
    fictionId: string,
    commentId: string,
    updateData: { content: string }
  ): Promise<Comment> {
    const result = await this.database
      .collection<Comment>(Constant.COMMENT_COLLECTION)
      .findOneAndUpdate(
        {
          _id: new ObjectId(commentId),
          fiction: new ObjectId(fictionId),
          user: new ObjectId(this.userId),
        },
        { $set: { ...updateData, updatedAt: new Date() } },
        { returnDocument: "after" }
      );

    if (!result)
      throw new NotFoundError(
        "Comment not found or you are not authorized to update it"
      );
    return result;
  }

  async deleteComment(fictionId: string, commentId: string): Promise<boolean> {
    const result = await this.database
      .collection<Comment>(Constant.COMMENT_COLLECTION)
      .deleteOne({
        _id: new ObjectId(commentId),
        fiction: new ObjectId(fictionId),
        user: new ObjectId(this.userId),
      });

    if (!result.acknowledged) throw new Error("Failed to delete comment");

    if (result.deletedCount === 1) {
      await this.database
        .collection<Fiction>(Constant.FICTION_COLLECTION)
        .updateOne(
          { _id: new ObjectId(fictionId) },
          { $inc: { "stats.commentCount": -1 } }
        );
    }

    return result.deletedCount === 1;
  }

  async rateComment(commentId: string, isUseful: boolean) {
    const comment = await this.database
      .collection<Comment>(Constant.COMMENT_COLLECTION)
      .findOne({
        _id: new ObjectId(commentId),
      });

    if (!comment) throw new NotFoundError("Comment not found");

    const userId = new ObjectId(this.userId);

    if (isUseful) {
      await this.database
        .collection<Comment>(Constant.COMMENT_COLLECTION)
        .updateOne(
          { _id: new ObjectId(commentId) },
          { $pull: { dislikes: userId } }
        );

      const result = await this.database
        .collection<Comment>(Constant.COMMENT_COLLECTION)
        .updateOne(
          { _id: new ObjectId(commentId) },
          { $addToSet: { likes: userId } }
        );

      if (!result.acknowledged) throw new Error("Failed to rate comment");
    } else {
      await this.database
        .collection<Comment>(Constant.COMMENT_COLLECTION)
        .updateOne(
          { _id: new ObjectId(commentId) },
          { $pull: { likes: userId } }
        );

      const result = await this.database
        .collection<Comment>(Constant.COMMENT_COLLECTION)
        .updateOne(
          { _id: new ObjectId(commentId) },
          { $addToSet: { dislikes: userId } }
        );

      if (!result.acknowledged) throw new Error("Failed to rate comment");
    }

    const updatedComment = await this.database
      .collection<Comment>(Constant.COMMENT_COLLECTION)
      .findOne({
        _id: new ObjectId(commentId),
      });

    if (!updatedComment) throw new Error("Failed to retrieve updated comment");

    return updatedComment;
  }
}
