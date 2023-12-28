import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import mongoose, { Schema as Schema$2 } from "mongoose";
import Joi from "joi";
import mongoosePaginate from "mongoose-paginate-v2";
import moment from "moment";
import jwt from "jsonwebtoken";
import admin from "firebase-admin";
import randomstring from "randomstring";
import twilio from "twilio";
import bcrypt from "bcryptjs";
import { startOfDay, endOfDay, format, parse, subDays, addDays, differenceInMinutes } from "date-fns";
import "dotenv/config";
import nodemailer from "nodemailer";
import fs from "fs";
import querystring from "qs";
import crypto from "crypto";
import swaggerJSDoc from "swagger-jsdoc";
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.API_DB);
    console.log("connecting successful");
  } catch (error) {
    console.log(error);
  }
};
const Schema$1 = mongoose.Schema;
const Booking = new Schema$1(
  {
    pitch_id: { type: String, require: true },
    user_id: { type: String, require: true },
    shift_id: { type: String, require: true },
    children_pitch_id: { type: String, require: true },
    payment_id: { type: String, require: true },
    service_ids: [{ type: String }],
    status: { type: String, require: true, enum: ["success", "cancel"], default: "success" }
    //success - đặt lịch thành công, cancel: user hủy đặt lịch
  },
  { collection: "booking", timestamps: true }
);
const BookingModel = mongoose.model("booking", Booking);
const pipeLine = [
  {
    $unwind: {
      path: "$service_ids",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $addFields: {
      userId: { $toObjectId: "$user_id" },
      pitchId: { $toObjectId: "$pitch_id" },
      paymentId: { $toObjectId: "$payment_id" },
      shiftId: { $toObjectId: "$shift_id" },
      childrenPitchId: { $toObjectId: "$children_pitch_id" },
      serviceIds: { $toObjectId: "$service_ids" }
    }
  },
  {
    $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "user"
    }
  },
  {
    $unwind: { path: "$user", preserveNullAndEmptyArrays: true }
  },
  {
    $lookup: {
      from: "childrenpitches",
      localField: "childrenPitchId",
      foreignField: "_id",
      as: "childrenPitch"
    }
  },
  {
    $unwind: { path: "$childrenPitch", preserveNullAndEmptyArrays: true }
  },
  {
    $lookup: {
      from: "pitches",
      localField: "pitchId",
      foreignField: "_id",
      as: "pitch"
    }
  },
  {
    $unwind: { path: "$pitch", preserveNullAndEmptyArrays: true }
  },
  {
    $lookup: {
      from: "payment",
      localField: "paymentId",
      foreignField: "_id",
      as: "payment"
    }
  },
  {
    $unwind: { path: "$payment", preserveNullAndEmptyArrays: true }
  },
  {
    $lookup: {
      from: "shifts",
      localField: "shiftId",
      foreignField: "_id",
      as: "shift"
    }
  },
  {
    $unwind: { path: "$shift", preserveNullAndEmptyArrays: true }
  },
  {
    $lookup: {
      from: "services",
      localField: "serviceIds",
      foreignField: "_id",
      as: "services"
    }
  },
  {
    $group: {
      _id: "$_id",
      fields: { $first: "$$ROOT" },
      services: { $push: { $arrayElemAt: ["$services", 0] } }
    }
  },
  {
    $replaceRoot: {
      newRoot: {
        $mergeObjects: ["$fields", { services: "$services" }]
      }
    }
  },
  {
    $project: {
      user_id: 1,
      user_booking: {
        _id: "$user._id",
        name: "$user.name",
        email: "$user.email",
        phone_number: "$user.phone_number"
      },
      payment_id: 1,
      pitch_id: 1,
      children_pitch_id: 1,
      pitch: {
        _id: "$pitch._id",
        name: "$pitch.name",
        avatar: "$pitch.avatar",
        address: "$pitch.address",
        price: "$pitch.price"
      },
      childrenPitch: 1,
      payment: {
        _id: "$payment._id",
        payment_method: "$payment.method",
        price_received: "$payment.price_received",
        code: "$payment.code",
        total_received: "$payment.total_received",
        status: "$payment.status",
        message: "$payment.message"
      },
      status: 1,
      pitch_code: "$childrenPitch.code_chirldren_pitch",
      shift_id: 1,
      shift: 1,
      services: {
        $map: {
          input: "$services",
          as: "item",
          in: {
            _id: "$$item._id",
            name: "$$item.name",
            image: "$$item.image",
            price: "$$item.price"
          }
        }
      },
      createdAt: 1,
      updatedAt: 1
    }
  }
];
const getList$5 = async (options2) => {
  const { skip, limit, sort, ...query } = options2;
  const filter = {
    ...query
  };
  return await BookingModel.aggregate([
    {
      $match: filter
    },
    ...pipeLine,
    // {
    //     $match: {
    //         "user_booking.name": {
    //             $regex: "hii",
    //             $options: "i",
    //         },
    //     },
    // },
    {
      $sort: sort
    }
  ]);
};
const countDocuments$2 = async () => {
  return await BookingModel.countDocuments();
};
const getById$j = async (bookingId) => {
  return await BookingModel.findById(bookingId);
};
const getOne$1 = async (condition) => {
  return await BookingModel.findOne(condition);
};
const getByField$1 = async (field) => {
  const { _id, ...obj } = field;
  let condition = [{ $match: obj }];
  if (_id) {
    condition = [{ $match: { _id: new mongoose.Types.ObjectId(_id) } }];
  }
  const result = await BookingModel.aggregate([...condition, ...pipeLine]);
  return result.length > 0 ? result[0] : null;
};
const create$k = async (booking) => {
  const newBooking = new BookingModel(booking);
  return await newBooking.save();
};
const update$n = async (booking) => {
  const { id, ...data } = booking;
  return await BookingModel.findByIdAndUpdate(booking.id, data, { new: true });
};
const destroy$3 = async (bookingId) => {
  return await BookingModel.findByIdAndDelete(bookingId);
};
const serverError = (messageError) => {
  return {
    error: true,
    statusCode: 500,
    message: "Lỗi hệ thống !!!",
    detailError: messageError
  };
};
const getList$4 = async (req, res) => {
  try {
    const { _sort = "createdAt", page = 1, limit = 10, _order = "desc", ...params } = req.query;
    const options2 = {
      skip: (page - 1) * limit,
      limit,
      sort: {
        [_sort]: _order === "desc" ? -1 : 1
      },
      ...params
    };
    const [bookings, count] = await Promise.all([getList$5(options2), countDocuments$2()]);
    res.status(200).json({
      meassge: "Success",
      data: bookings,
      currentPage: page,
      totalPage: Math.ceil(count / limit),
      length: bookings.length
    });
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getById$i = async (req, res) => {
  try {
    const booking = await getById$j(req.params.id);
    res.json({
      meassge: "Success",
      data: booking
    });
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const create$j = async (req, res) => {
  try {
    const newBooking = await create$k(req.body);
    res.json({
      meassge: "New booking success",
      data: newBooking
    });
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getByField = async (req, res) => {
  try {
    const bookingDb = await getByField$1(req.query);
    res.json({
      meassge: "Lấy dữ liệu booking thành công",
      data: bookingDb
    });
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const createAffterPay = async (req, res) => {
  try {
    const { payment_id } = req.body;
    const bookingDb = await getOne$1({ payment_id });
    if (bookingDb) {
      return res.status(200).json({ message: "Sân đã được đặt trước đó" });
    }
    const newBooking = await create$k(req.body);
    res.status(201).json({
      meassge: "New booking success",
      data: newBooking
    });
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const update$m = async (req, res) => {
  try {
    const bookingUpdated = await update$n({ ...req.body, id: req.params.id });
    res.json({
      meassge: "Update booking success",
      data: bookingUpdated
    });
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const destroy$2 = async (req, res) => {
  try {
    const bookingDeleted = await destroy$3(req.params.id);
    res.json({
      meassge: "Delete booking successfully",
      data: bookingDeleted
    });
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const validation$2 = (req, res, next) => {
  const schema = Joi.object({
    pitch_id: Joi.string().required(),
    user_id: Joi.string().required(),
    shift_id: Joi.string().required(),
    children_pitch_id: Joi.string().required(),
    payment_id: Joi.string().required(),
    service_ids: Joi.array().items(Joi.string())
  });
  const result = schema.validate(req.body);
  try {
    if (result.error) {
      return res.status(401).json({ error: 2, message: result.error.details[0].message });
    }
    next();
  } catch (err) {
    return res.status(500).json({
      err: 1,
      message: new Error(err).message
    });
  }
};
const bookingRouter = express.Router();
bookingRouter.route("/affter-pay").post(validation$2, createAffterPay);
bookingRouter.route("/get-by-field").get(getByField);
bookingRouter.route("/:id").get(getById$i).delete(destroy$2).put(validation$2, update$m);
bookingRouter.route("/").get(getList$4).post(validation$2, create$j);
const badRequest = (statusCode, message) => {
  return {
    error: true,
    statusCode: 400,
    message: message || "Tài nguyên không hợp lệ"
  };
};
const successfully = (data, message) => {
  return {
    error: false,
    statusCode: 200,
    message: message || "Thành công !!",
    data
  };
};
const roleSchema$1 = new Schema$2(
  {
    name: {
      type: String,
      required: true
    },
    permissions: [
      {
        type: Schema$2.Types.ObjectId,
        ref: "Permission"
      }
    ]
  },
  {
    timestamps: true,
    versionKey: false
  }
);
const Role = mongoose.model("Role", roleSchema$1);
const permissionSchema$1 = new Schema$2(
  {
    name: {
      type: String,
      required: true
    },
    role_id: {
      type: Schema$2.Types.ObjectId,
      ref: "Role"
    },
    code: {
      type: Number
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);
permissionSchema$1.pre("save", async function(next) {
  if (this.isNew) {
    const permission = this;
    const role = await Role.findById(permission.role_id);
    role.permissions.push(permission._id);
    await role.save();
  }
  next();
});
const Permission = mongoose.model("Permission", permissionSchema$1);
const getAll$h = async () => {
  return Permission.find();
};
const getById$h = async (id) => {
  return Permission.findById(id);
};
const create$i = async (data) => {
  return Permission.create(data);
};
const update$l = async (id, data) => {
  return Permission.findByIdAndUpdate(id, data, {
    new: true
  });
};
const remove$j = async (id) => {
  return Permission.findByIdAndDelete(id);
};
const getAll$g = async () => {
  return Role.find().populate("permissions");
};
const getById$g = async (id) => {
  return Role.findById(id).populate("permissions");
};
const create$h = async (data) => {
  return Role.create(data);
};
const update$k = async (id, data) => {
  return Role.findByIdAndUpdate(id, data, {
    new: true
  });
};
const remove$i = async (id) => {
  return Role.findByIdAndDelete(id);
};
const userSchema$1 = new Schema$2(
  {
    name: {
      type: String
    },
    phone_number: {
      type: String
    },
    role_id: {
      type: String
    },
    email: {
      type: String
    },
    password: {
      type: String
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);
const userModel = mongoose.model("User", userSchema$1);
const getList$3 = async (options2) => {
  const { skip, limit, sort, ...params } = options2;
  return await userModel.find(params).sort(sort).skip(skip).limit(limit);
};
const countDocuments$1 = async () => {
  return await userModel.countDocuments();
};
const getById$f = async (id) => {
  return userModel.findById(id);
};
const getByOptions$2 = (options2) => {
  const query = {
    [options2.field]: options2.payload
  };
  return userModel.findOne(query);
};
const create$g = (data) => {
  return userModel.create(data);
};
const update$j = (id, data) => {
  return userModel.findByIdAndUpdate(id, data, {
    new: true
  });
};
const remove$h = (id) => {
  return userModel.findByIdAndDelete(id);
};
const otpSchema$1 = new Schema$2(
  {
    phone_number: {
      type: String,
      required: true
    },
    otp: {
      type: String,
      required: true
    },
    expireAt: {
      type: Number,
      require: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);
const Otp = mongoose.model("Otp", otpSchema$1);
const getAll$f = async () => {
  return Otp.find();
};
const getById$e = async (id) => {
  return Otp.findById(id);
};
const getByOptions$1 = (options2) => {
  const query = {
    [options2.field]: options2.payload
  };
  return Otp.findOne(query);
};
const create$f = async (data) => {
  return Otp.create(data);
};
const update$i = async (id, data) => {
  return Otp.findByIdAndUpdate(id, data, {
    new: true
  });
};
const remove$g = async (id) => {
  return Otp.findByIdAndDelete(id);
};
const commentSchema$1 = new Schema$2(
  {
    id_user: { type: mongoose.ObjectId, ref: "User", require: true },
    content: { type: String, require: true },
    id_post: { type: mongoose.ObjectId, ref: "Post" }
  },
  { versionKey: false, timestamps: true }
);
commentSchema$1.virtual("createdAtVietnam").get(function() {
  return moment(this.createdAt).utcOffset(7);
});
commentSchema$1.virtual("updatedAtVietnam").get(function() {
  return moment(this.updatedAt).utcOffset(7);
});
commentSchema$1.plugin(mongoosePaginate);
const Comment = mongoose.model("Comment", commentSchema$1);
const deleteComments = async function(next) {
  try {
    const { _id: id_post } = this.getFilter();
    await Comment.deleteMany({ id_post });
    next();
  } catch (err) {
    next(err);
  }
};
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;
  if (token) {
    jwt.verify(token, process.env.SECRETKEY, (error, user) => {
      if (error) {
        return res.status(401).json({
          error: true,
          message: "Token không hợp lệ!"
        });
      }
      req.user = user;
      next();
    });
  } else {
    res.status(403).json({
      error: true,
      message: "Tài khoản của bạn không được xác thực!"
    });
  }
};
const verifyAdminPitch = (req, res, next) => {
  const token = req.headers.authorization;
  if (token) {
    jwt.verify(token, process.env.SECRETKEY, async (error, user) => {
      if (error) {
        return res.status(401).json({
          error: true,
          message: "Token không hợp lệ!"
        });
      }
      const role = await getById$g(user.role_id);
      if ((role == null ? void 0 : role.name) === "adminPitch") {
        next();
      } else {
        return res.status(402).json({
          error: true,
          message: "Bạn không có quyền thực hiện tác vụ này!"
        });
      }
    });
  } else {
    res.status(403).json({
      error: true,
      message: "Tài khoản của bạn không được xác thực!"
    });
  }
};
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization;
  if (token) {
    jwt.verify(token, process.env.SECRETKEY, async (error, user) => {
      if (error) {
        return res.status(401).json({
          error: true,
          message: "Token không hợp lệ!"
        });
      }
      const role = await getById$g(user.role_id);
      if ((role == null ? void 0 : role.name) === "admin") {
        next();
      } else {
        return res.status(402).json({
          error: true,
          message: "Bạn không có quyền thực hiện tác vụ này!"
        });
      }
    });
  } else {
    res.status(403).json({
      error: true,
      message: "Tài khoản của bạn không được xác thực!"
    });
  }
};
const postSchema$1 = new Schema$2(
  {
    title: { type: String, require: true },
    description: { type: String, require: true },
    images: [{ type: String, required: true }],
    comment_id: [{ type: mongoose.ObjectId, ref: "Comment" }]
  },
  { versionKey: false, timestamps: true }
);
postSchema$1.plugin(mongoosePaginate);
postSchema$1.virtual("createdAtVietnam").get(function() {
  return moment(this.createdAt).utcOffset(7);
});
postSchema$1.virtual("updatedAtVietnam").get(function() {
  return moment(this.updatedAt).utcOffset(7);
});
postSchema$1.pre("findOneAndDelete", deleteComments);
const Post = mongoose.model("Post", postSchema$1);
const getAllPost$1 = (options2) => {
  return Post.paginate(
    {},
    {
      ...options2,
      populate: ["comment_id"]
    }
  );
};
const getPost$1 = (idPost) => {
  return Post.findById(idPost).populate([]);
};
const getPostByUser$1 = (id_user) => {
  return Post.find({ id_user });
};
const createPost$1 = (post) => {
  return Post.create(post);
};
const updatePost$1 = (post) => {
  const { idPost, ...data } = post;
  return Post.findByIdAndUpdate(idPost, data, { new: true });
};
const deletePost$1 = (idPost) => {
  return Post.findByIdAndDelete(idPost);
};
const getAllComment$1 = (options2) => {
  return Comment.paginate(
    {},
    {
      ...options2,
      populate: ["id_user", "id_post"]
    }
  );
};
const getComment$1 = (idComment) => {
  return Comment.findById(idComment).populate("id_user");
};
const getCommentByPost$1 = (id_post) => {
  return Comment.find({ id_post });
};
const createComment$1 = (comment) => {
  return Comment.create(comment);
};
const updateComment$1 = (comment) => {
  const { idComment, ...data } = comment;
  return Comment.findByIdAndUpdate(idComment, data, { new: true });
};
const deleteComment$1 = (idComment) => {
  return Comment.findByIdAndDelete(idComment);
};
const childrenPitchSchema$1 = new mongoose.Schema(
  {
    idParentPitch: {
      type: mongoose.ObjectId,
      ref: "Pitch",
      required: true
    },
    code_chirldren_pitch: {
      type: Number,
      min: 1,
      required: true
    },
    image: {
      type: String,
      required: true
    }
  },
  { timestamps: true, versionKey: false }
);
const ChildrenPitch = mongoose.model("ChildrenPitch", childrenPitchSchema$1);
const getAll$e = async () => {
  return ChildrenPitch.find();
};
const getById$d = async (id) => {
  return ChildrenPitch.findById(id);
};
const getChildrenPitchsByParent$1 = (idParentPitch) => {
  return ChildrenPitch.find({ idParentPitch });
};
const create$e = async (data) => {
  return ChildrenPitch.create(data);
};
const update$h = async (id, data) => {
  return ChildrenPitch.findByIdAndUpdate(id, data, {
    new: true
  });
};
const remove$f = async (id) => {
  return ChildrenPitch.findByIdAndDelete(id);
};
const shiftSchema$1 = new mongoose.Schema(
  {
    id_chirlden_pitch: {
      type: mongoose.ObjectId,
      ref: "ChildrenPitch"
    },
    id_pitch: {
      type: mongoose.ObjectId,
      ref: "Pitch",
      require: true
    },
    number_shift: {
      type: Number,
      min: 1
      // require: true,
    },
    start_time: {
      type: String
      // required: true,
    },
    end_time: {
      type: String
      // required: true,
    },
    price: {
      type: Number,
      required: true
    },
    status_shift: {
      type: Boolean
    },
    date: [
      {
        type: String
      }
    ],
    find_opponent: {
      type: String,
      enum: ["Find", "NotFind"],
      default: "NotFind"
    },
    default: {
      type: Boolean,
      default: false
    },
    is_booking_month: {
      type: Boolean,
      default: false
    },
    isCancelBooking: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true, versionKey: false }
);
const shiftModel = mongoose.model("Shift", shiftSchema$1);
const getAll$d = async () => {
  return shiftModel.find();
};
const getListByOptions = (options2) => {
  const query = {
    [options2.field]: options2.payload
  };
  return shiftModel.find(query);
};
const getListByOptionsPopulate = (options2) => {
  const query = {
    [options2.field]: options2.payload
  };
  return shiftModel.find(query).populate(["id_pitch", "id_chirlden_pitch"]);
};
const getById$c = async (id) => {
  return shiftModel.findById(id).populate("id_pitch");
};
const creat = async (data) => {
  return shiftModel.create(data);
};
const update$g = async (id, data) => {
  return shiftModel.findByIdAndUpdate(id, data, { new: true });
};
const remove$e = async (id) => {
  return shiftModel.findByIdAndDelete(id);
};
const LocationSchema = new Schema$2(
  {
    name: {
      type: String,
      required: true,
      unique: true
    },
    pitchs: [
      {
        type: mongoose.ObjectId,
        ref: "Pitch"
      }
    ]
  },
  { versionKey: false, timestamps: true }
);
const Location = mongoose.model("Location", LocationSchema);
const getAllLocation = () => {
  return Location.find();
};
const getOneLocation = async (locationId) => {
  return await Location.findById(locationId);
};
const creatLocation = async (location) => {
  const product = new Location(location);
  return await product.save();
};
const updateLocation = async (location) => {
  const { id, ...data } = location;
  return await Location.findByIdAndUpdate(location.id, data, { new: true });
};
const deleteLocation = async (locationId) => {
  return await Location.findByIdAndDelete(locationId);
};
const PitchSchema = new Schema$2(
  {
    address: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    admin_pitch_id: {
      type: mongoose.ObjectId,
      ref: "User",
      required: true
    },
    numberPitch: {
      type: Number,
      required: true
    },
    images: {
      type: Array,
      required: true,
      default: []
    },
    description: {
      type: String,
      required: true
    },
    services: [
      {
        type: mongoose.ObjectId,
        ref: "Service"
      }
    ],
    districts_id: {
      type: String,
      required: true
    },
    location_id: {
      type: String,
      required: true
    },
    average_price: {
      type: Number,
      default: 0
    },
    avatar: {
      type: String,
      required: true
    },
    comment_id: [{ type: mongoose.ObjectId, ref: "Comment" }],
    feedback_id: [{ type: mongoose.ObjectId, ref: "Feedback" }]
  },
  { versionKey: false, timestamps: true }
);
PitchSchema.plugin(mongoosePaginate);
const Pitch = mongoose.model("Pitch", PitchSchema);
const getAllPitch = async (options2) => {
  return Pitch.paginate(
    {},
    {
      ...options2,
      populate: ["admin_pitch_id", "services", "feedback_id"]
    }
  );
};
const getServiceAdminPitch = async (idPitch) => {
  return Pitch.findById(idPitch).populate("services");
};
const filterFeedbackPitch = async (options2) => {
  console.log(options2);
  return Pitch.paginate(
    {},
    {
      ...options2,
      populate: ["feedback_id"]
    }
  );
};
const getOnePitch = async (pitchId) => {
  try {
    const pitch = await Pitch.findById(pitchId).populate([
      "admin_pitch_id",
      "services"
    ]);
    if (!pitch) {
      throw new Error("Không tìm thấy sân bóng");
    }
    return pitch;
  } catch (error) {
    throw new Error(`Lỗi khi lấy thông tin sân bóng: ${error.message}`);
  }
};
const getFeedbackPitch$1 = (idPitch) => {
  return Pitch.findById(idPitch).populate([]);
};
const getPitchByUser = (id_user) => {
  return Pitch.find({ admin_pitch_id: id_user }).populate(["admin_pitch_id", "services"]);
};
const creatPitch = async (pitch) => {
  const product = new Pitch(pitch);
  return await product.save();
};
const updatePitch = async (pitch) => {
  const { id, ...data } = pitch;
  return await Pitch.findByIdAndUpdate(pitch.id, data, { new: true }).populate(["admin_pitch_id", "services"]);
};
const deletePitch = async (pitchId) => {
  return await Pitch.findByIdAndDelete(pitchId);
};
const feedbackSchema$1 = new Schema$2(
  {
    id_user: { type: mongoose.ObjectId, ref: "User", require: true },
    id_pitch: { type: mongoose.ObjectId, ref: "Pitch", require: true },
    quantity_star: { type: Number, min: 1, max: 5, require: true }
  },
  { versionKey: false, timestamps: true }
);
feedbackSchema$1.virtual("createdAtVietnam").get(function() {
  return moment(this.createdAt).utcOffset(7);
});
feedbackSchema$1.virtual("updatedAtVietnam").get(function() {
  return moment(this.updatedAt).utcOffset(7);
});
feedbackSchema$1.plugin(mongoosePaginate);
const Feedback = mongoose.model("Feedback", feedbackSchema$1);
const getAllFeedback$1 = (options2) => {
  return Feedback.paginate(
    {},
    {
      ...options2,
      populate: ["id_user"]
    }
  );
};
const getByOptions = (options2) => {
  const query = {
    [options2.field]: options2.payload
  };
  return Feedback.findOne(query);
};
const getOneFeedback = (idFeedback) => {
  return Feedback.findById(idFeedback).populate("id_user");
};
const createFeedback$1 = (feedback) => {
  return Feedback.create(feedback);
};
const updateFeedback$1 = (feedback) => {
  const { idFeedback, ...data } = feedback;
  return Feedback.findByIdAndUpdate(idFeedback, data, { new: true });
};
const deleteFeedback$1 = (idFeedback) => {
  return Feedback.findByIdAndDelete(idFeedback);
};
const emailSchema$1 = new Schema$2(
  {
    email_to: {
      type: String,
      required: true
    },
    subject: {
      type: String,
      required: true
    },
    content: {
      type: String,
      require: true
    },
    html: {
      type: String
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);
const Email = mongoose.model("Email", emailSchema$1);
const getAll$c = async () => {
  return Email.find();
};
const getById$b = async (id) => {
  return Email.findById(id);
};
const create$d = async (data) => {
  return Email.create(data);
};
const update$f = async (id, data) => {
  return Email.findByIdAndUpdate(id, data, {
    new: true
  });
};
const remove$d = async (id) => {
  return Email.findByIdAndDelete(id);
};
const serviceSchema$1 = new Schema$2(
  {
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    admin_pitch_id: {
      type: mongoose.ObjectId,
      ref: "User",
      required: true
    },
    pitch_id: {
      type: mongoose.ObjectId,
      ref: "Pitch",
      required: true
    },
    image: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);
const ServiceModel = mongoose.model("Service", serviceSchema$1);
const getAll$b = async (query) => {
  return ServiceModel.find(query);
};
const getOneService = async (serviceId) => {
  return ServiceModel.findById(serviceId).populate("admin_pitch_id");
};
const addIdPitch = async (service) => {
  return Pitch.findByIdAndUpdate(service.pitch_id, {
    $addToSet: { services: service._id }
  });
};
const removeIdPitch = async (service) => {
  return Pitch.findByIdAndUpdate(service == null ? void 0 : service.pitch_id, {
    $pull: { services: service == null ? void 0 : service.id }
  });
};
const create$c = async (data) => {
  return await ServiceModel.create(data);
};
const update$e = async (service) => {
  const { id, ...body } = service;
  return await ServiceModel.findByIdAndUpdate(service.id, body, { new: true });
};
const remove$c = async (serviceId) => {
  return await ServiceModel.findByIdAndDelete(serviceId);
};
const permissionSchema = Joi.object({
  name: Joi.string().min(3).required(),
  role_id: Joi.string().required(),
  code: Joi.number().required()
});
const bannerSchema$1 = Joi.object({
  _id: Joi.string(),
  url: Joi.string().required(),
  title: Joi.string().required(),
  content: Joi.string().required()
});
const serviceSchema = Joi.object({
  admin_pitch_id: Joi.string().required(),
  name: Joi.string().required(),
  pitch_id: Joi.string().required(),
  price: Joi.number().required().min(1),
  image: Joi.string().required()
});
const roleSchema = Joi.object({
  name: Joi.string().required(),
  permissions: Joi.array()
});
const userSchema = Joi.object({
  name: Joi.string(),
  phone_number: Joi.string(),
  role_id: Joi.string(),
  email: Joi.string(),
  password: Joi.string()
});
const otpSchema = Joi.object({
  phone_number: Joi.string().required(),
  otp: Joi.string().required(),
  expireAt: Joi.number().required()
});
const postSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  images: Joi.array().required(),
  comment_id: Joi.array()
});
const commentSchema = Joi.object({
  id_user: Joi.string().required(),
  content: Joi.string().required(),
  id_post: Joi.string()
});
const childrenPitchSchema = Joi.object({
  idParentPitch: Joi.string().required(),
  code_chirldren_pitch: Joi.number().min(1).required(),
  image: Joi.string().required()
});
const shiftSchema = Joi.object({
  id_chirlden_pitch: Joi.string(),
  id_pitch: Joi.string().required(),
  number_shift: Joi.number().allow(null).min(1).required(),
  start_time: Joi.string().allow(null).required(),
  end_time: Joi.string().allow(null).required(),
  price: Joi.number().required(),
  status_shift: Joi.boolean(),
  date: Joi.array(),
  find_opponent: Joi.string(),
  default: Joi.boolean(),
  is_booking_month: Joi.boolean(),
  isCancelBooking: Joi.boolean()
});
const locationSchema = Joi.object({
  name: Joi.string().required(),
  pitchs: Joi.array().required()
});
const pitchSchema = Joi.object({
  name: Joi.string().required(),
  address: Joi.string().required(),
  admin_pitch_id: Joi.string(),
  images: Joi.array().items(Joi.string()).required(),
  numberPitch: Joi.number().required(),
  description: Joi.string().required(),
  location_id: Joi.string().required(),
  districts_id: Joi.string(),
  average_price: Joi.number(),
  avatar: Joi.string().required()
});
const feedbackSchema = Joi.object({
  id_user: Joi.string().required(),
  id_pitch: Joi.string().required(),
  quantity_star: Joi.number().min(1).max(5).required()
});
const emailSchema = Joi.object({
  email_to: Joi.string().required(),
  subject: Joi.string().required(),
  content: Joi.string().required(),
  html: Joi.string()
});
const getAll$a = async (req, res) => {
  try {
    const permissions = await getAll$h();
    if (!permissions) {
      return res.status(400).json(badRequest(400, "Lấy dữ liệu thất bại"));
    }
    res.status(200).json(successfully(permissions, "Lấy dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getById$a = async (req, res) => {
  try {
    const permission = await getById$h(req.params.id);
    if (!permission) {
      return res.status(400).json(badRequest(400, "Lấy dữ liệu thất bại"));
    }
    res.status(200).json(successfully(permission, "Lấy dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const create$b = async (req, res) => {
  try {
    const { error } = permissionSchema.validate(req.body);
    if (error) {
      return res.status(400).json(badRequest(400, error.details[0].message));
    }
    const permission = await create$i(req.body);
    if (!permission) {
      return res.status(400).json(badRequest(400, "Thêm không thành công !!!"));
    }
    res.status(200).json(successfully(permission, "Thêm thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const update$d = async (req, res) => {
  try {
    const { error } = permissionSchema.validate(req.body);
    if (error) {
      return res.status(400).json(badRequest(400, error.details[0].message));
    }
    const permission = await update$l(req.params.id, req.body, {
      new: true
    });
    if (!permission) {
      return res.status(400).json(badRequest(400, "Cập nhật không thành công !!!"));
    }
    res.status(200).json(successfully(permission, "Cập nhật thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const remove$b = async (req, res) => {
  try {
    const permission = await remove$j(req.params.id);
    if (!permission) {
      return res.status(400).json(badRequest(400, "Xóa không thành công !!!"));
    }
    res.status(200).json(successfully(permission, "Xóa thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getAll$9 = async (req, res) => {
  try {
    const roles = await getAll$g();
    if (!roles) {
      return res.status(400).json(badRequest(400, "Lấy dữ liệu thất bại"));
    }
    res.status(200).json(successfully(roles, "Lấy dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getById$9 = async (req, res) => {
  try {
    const role = await getById$g(req.params.id);
    if (!role) {
      return res.status(400).json(badRequest(400, "Lấy dữ liệu thất bại"));
    }
    res.status(200).json(successfully(role, "Lấy dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const create$a = async (req, res) => {
  try {
    const { error } = roleSchema.validate(req.body);
    if (error) {
      return res.status(400).json(badRequest(400, error.details[0].message));
    }
    const role = await create$h(req.body);
    if (!role) {
      return res.status(400).json(badRequest(400, "Thêm không thành công !!!"));
    }
    res.status(200).json(successfully(role, "Thêm thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const update$c = async (req, res) => {
  try {
    const { error } = roleSchema.validate(req.body);
    if (error) {
      return res.status(400).json(badRequest(400, error.details[0].message));
    }
    const role = await update$k(req.params.id, req.body, {
      new: true
    });
    if (!role) {
      return res.status(400).json(badRequest(400, "Cập nhật không thành công !!!"));
    }
    res.status(200).json(successfully(role, "Cập nhật thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const remove$a = async (req, res) => {
  try {
    const role = await remove$i(req.params.id);
    if (!role) {
      return res.status(400).json(badRequest(400, "Xóa không thành công !!!"));
    }
    res.status(200).json(successfully(role, "Xóa thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const type = "service_account";
const project_id = "datn-93e6c";
const private_key_id = "f58d16a4aa8730ab333ab97b2c709cabf5dddf22";
const private_key = "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDQbeDIPvy+UG3t\nc/c+ZVdtH2YgZVjIysTRrtaajMqOw2V0Sqd8zCV0m95V62CoW22GTa0q8sN/Uvgm\nmJlnn1h+CaaXjgELOWvW0SSVWJ7qxk7tSONt4wU9GAALcCypHuMABdJJzY5/uJ8l\n2v9iGLLFnWBe2rinz3sbeKhhkGiw3CjYPROnYiaajZPXDz78r+4cLsMfA2ogMqQ5\nfcH/DjD5S4lhM4KC/Lo1yY06NC9EEJfiLiOsM9a0pe0LsDxK2G3C5AzF5fsSJeY2\neGwO1OtfGgfjgGJU0ZV7gLp7L/Qzb5fKzP5rrIIVTcq3lN6qiunEMZD+0awkRd3d\nlK5OmW5fAgMBAAECggEAHF7AaHFOZLc850PQJRGVP1i1RXaWCaqz9JiYRGwijCEj\nl5srxgxhksg+kLJbsz7SnyPGjOCDZLrN5S8DPnwNhwZYQyvEj5sOxywrjxqDcxBw\nINM5hbUPevvf0a7AnXqDSncAYyRUH6VpIDV5aohTGRvtSKv703el2ZzoSnNmFKB8\nAnan0+qN/WRLpUvSf5aA8CzeY1te5eo+SijmtY9vHT9OvVmxsfGI+XTSfTX6q4oK\nLIFlNwCVWwTnFfaxUeYiTK709CDms0pSfmZCbFeavt6hn4CTvIdRNm69Mos1mPxL\nsGlXZcHV3u9yuNwRrbHbX1I0FQJAPLFY25LA9elpVQKBgQDz+Zwdc+8BedazQe8n\nn4b4FenldHG9uDbPmGU1yDvAfByD5UeKFbyYzXmoruUJw9mYTmWYm83ON1kzSvEW\nZUO7dCOO22v1bXvgz0/Z9QEtk+OsPPG0HeFoQZ9EbZvCv4IKN4s7EJf+kxtgT+Xz\nAM4FDzUKfzRnDnJ0GBCBv/uBYwKBgQDas8N9yEfbXHvm5LhTTVjtzCHsoDOfe+G1\npxLtOojH+C9wG1ON6Q+peqCQcaPHtyapwTl987iD35GC9UGDwDP+O7fDhTStqgeu\n26LblDzF+TROasJqg1v5O4vsVn0aA+/xvUxqX/7ByimHc+3PnhmOn1TnSmJq7NQS\nX86+o6RN1QKBgE0xrTOkevr8kfIl6oWe9BWK2XbAYTymDLGihmN992nv2xXgdcI7\nHnE6kkPNEqsETNTj+UFQCs40tQSFscJkSAoHtTh+NKpy+b8n2RwdaUICiQb2QYO7\n8JYMLVh5Vc9IyNxytpr5pR3nbcILhbZditIO/blUhkAVUiFpe8+R7wIBAoGAPa69\n0FgQjDoFaBXSNwx1rHwKhWaZqL2T51v75pS/x0akeoX6hufY1wATESo7+zQY33/z\n6yY2QFtp+vmZRMOM5oOJTMfhF6oBCLxBrpScn2mt6wAJXWk3I5A74qhyGEhMAG5X\ngxkYDSgrllyIEiqRIrylgaZlI6swFQ6YjQQybxECgYAfMXl8SnZi6K0NJ2rGC7rl\nGTa8+elak8KWXfVqlSJ9b+SEnspprd/rG1a5pZ91WfT5aQTBUZuxQ+d59/0u48V5\nloXBXMdbSef6C993+uapWH5DaTpVQ/cAyfV4FLOW0A8k1bElrbMrs0e5a7pU1DGz\nOjnBqaZ2V3kymIL4ZUcDyw==\n-----END PRIVATE KEY-----\n";
const client_email = "firebase-adminsdk-f965p@datn-93e6c.iam.gserviceaccount.com";
const client_id = "106854870804991347987";
const auth_uri = "https://accounts.google.com/o/oauth2/auth";
const token_uri = "https://oauth2.googleapis.com/token";
const auth_provider_x509_cert_url = "https://www.googleapis.com/oauth2/v1/certs";
const client_x509_cert_url = "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-f965p%40datn-93e6c.iam.gserviceaccount.com";
const universe_domain = "googleapis.com";
const serviceAccount = {
  type,
  project_id,
  private_key_id,
  private_key,
  client_email,
  client_id,
  auth_uri,
  token_uri,
  auth_provider_x509_cert_url,
  client_x509_cert_url,
  universe_domain
};
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const firebase = admin;
const generateOtp = () => {
  const otpCode = randomstring.generate({ length: 6, charset: "numeric" });
  const otpExpiration = Date.now() + 2 * 60 * 1e3;
  return {
    otpCode,
    otpExpiration
  };
};
dotenv.config();
const generateToken = async (data) => {
  const token = jwt.sign(data, process.env.SECRETKEY, {
    expiresIn: "1d"
  });
  return token;
};
const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const sendOtp = (otp, recipientPhoneNumber) => {
  const client = twilio(accountSid, authToken);
  const message = `Your OTP is: ${otp}`;
  client.messages.create({
    body: message,
    from: twilioPhoneNumber,
    to: recipientPhoneNumber
  }).then((message2) => console.log("OTP sent successfully.")).catch((err) => console.error("Error sending OTP:", err));
};
const getList$2 = async (req, res) => {
  try {
    const {
      _sort = "createdAt",
      page = 1,
      limit = 50,
      _order = "desc",
      ...params
    } = req.query;
    const options2 = {
      skip: (page - 1) * limit,
      limit,
      sort: {
        [_sort]: _order === "desc" ? -1 : 1
      },
      ...params
    };
    const [users, count] = await Promise.all([
      getList$3(options2),
      countDocuments$1()
    ]);
    res.status(200).json({
      error: false,
      statusCode: 200,
      meassge: "Success",
      data: users,
      currentPage: page,
      totalPage: Math.ceil(count / limit),
      length: users.length
    });
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getById$8 = async (req, res) => {
  try {
    const role = await getById$f(req.params.id);
    if (!role) {
      return res.status(400).json(badRequest(400, "Lấy dữ liệu thất bại"));
    }
    res.status(200).json(successfully(role, "Lấy dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const login = async (req, res) => {
  try {
    const { error } = userSchema.validate(req.body);
    if (error) {
      return res.status(400).json(badRequest(400, error.details[0].message));
    }
    const { email, password } = req.body;
    const user = await getByOptions$2({
      field: "email",
      payload: email
    });
    if (!user) {
      return res.status(400).json(badRequest(400, "Email không tồn tại trong hệ thống!!!"));
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(200).json(badRequest(400, "Mật khẩu không hợp lệ!!!"));
    }
    const role = await getById$g(user.role_id);
    const values = {
      _id: user._id,
      name: user.name,
      role_id: user.role_id,
      email: user.email,
      createAt: user.createdAt,
      updatedAt: user.updatedAt,
      role_name: role.name,
      phone_number: user.phone_number
    };
    const token = await generateToken(values);
    res.status(200).json(successfully({ accessToken: token }));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const loginWithGoogle = async (req, res) => {
  try {
    const idToken = req.body.idToken;
    const decodedToken = await firebase.auth().verifyIdToken(idToken);
    let checkUser = await getByOptions$2({
      field: "email",
      payload: decodedToken.email
    });
    const role = await getById$g(
      checkUser.role_id || "655b87021ac3962a68ccf1b5"
    );
    if (checkUser) {
      const values = {
        _id: checkUser._id,
        name: checkUser.name,
        role_id: checkUser.role_id,
        email: checkUser.email,
        createAt: checkUser.createdAt,
        updatedAt: checkUser.updatedAt,
        role_name: role.name
      };
      const token = await generateToken(values);
      return res.status(200).json({
        error: false,
        message: "Đăng nhập thành công",
        accessToken: token
      });
    } else {
      const newUser = await create$g({
        email: decodedToken.email,
        name: decodedToken.name,
        role_id: "655b87021ac3962a68ccf1b5"
      });
      const values = {
        _id: newUser._id,
        name: newUser.name,
        role_id: newUser.role_id,
        email: newUser.email,
        createAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
        role_name: role.name
      };
      const token = await generateToken(values);
      return res.status(200).json({
        error: false,
        message: "Đăng nhập thành công",
        accessToken: token
      });
    }
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const loginWithOtp = async (req, res) => {
  try {
    const phoneNumber = req.body.phone_number;
    const { otpCode, otpExpiration } = generateOtp();
    if (phoneNumber) {
      const checkUser = await getByOptions$2({
        field: "phone_number",
        payload: phoneNumber
      });
      if (checkUser) {
        const formatPhoneNumber = `+84${phoneNumber.slice(1, 10)}`;
        sendOtp(otpCode, formatPhoneNumber);
        const checkOtp = await getByOptions$1({
          field: "phone_number",
          payload: phoneNumber
        });
        if (!checkOtp) {
          await create$f({
            otp: otpCode,
            phone_number: phoneNumber,
            expireAt: otpExpiration
          });
        } else {
          await update$i(checkOtp.id, {
            otp: otpCode,
            expireAt: otpExpiration
          });
        }
        return res.status(200).json({
          error: false,
          message: "Chúng tôi đã gửi một mã otp về số điện thoại của bạn, để xác minh rằng đây là số điện thoại của bạn hãy nhập mã xác minh."
        });
      } else {
        return res.status(400).json({
          error: false,
          message: "Người dùng không tồn tại trên hệ thống!!!"
        });
      }
    }
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const verifyOtp = async (req, res) => {
  try {
    const { phone_number, otpCode } = req.body;
    const otpForUser = await getByOptions$1({
      field: "phone_number",
      payload: phone_number
    });
    if (otpForUser.otp !== otpCode) {
      return res.status(400).json(badRequest(400, "Mã xác minh không hợp lệ"));
    } else if (otpForUser.expireAt < Date.now()) {
      return res.status(400).json(badRequest(400, "Mã xác minh đã hết hạn"));
    } else {
      const userForPhone = await getByOptions$2({
        field: "phone_number",
        payload: phone_number
      });
      const role = await getById$g(userForPhone.role_id);
      const values = {
        _id: userForPhone._id,
        name: userForPhone.name,
        role_id: userForPhone.role_id,
        email: userForPhone.email,
        createAt: userForPhone.createdAt,
        updatedAt: userForPhone.updatedAt,
        role_name: role.name
      };
      const token = await generateToken(values);
      return res.status(200).json({
        error: false,
        message: "Tài khoản đã xác minh thành công",
        accessToken: token
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json(serverError(error.message));
  }
};
const refetchOtp = async (req, res) => {
  try {
    const { phone_number } = req.body;
    const otpForUser = await getByOptions$1({
      field: "phone_number",
      payload: phone_number
    });
    const { otpCode, otpExpiration } = generateOtp();
    const formatPhoneNumber = `+84${phone_number.slice(1, 10)}`;
    if (otpForUser) {
      await update$i(otpForUser.id, {
        otp: otpCode,
        expireAt: otpExpiration
      });
    }
    sendOtp(otpCode, formatPhoneNumber);
    return res.status(200).json({
      error: false,
      message: "Refetch mã otp thành công, hãy kiểm tra tin nhắn trong điện thoại của bạn!!!"
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json(serverError(error.message));
  }
};
const register = async (req, res) => {
  try {
    const { error } = userSchema.validate(req.body);
    if (error) {
      return res.status(400).json(badRequest(400, error.details[0].message));
    }
    const { email, password, phone_number, name, role_id } = req.body;
    const checkNameUser = await getByOptions$2({
      field: "name",
      payload: name
    });
    if (checkNameUser) {
      return res.status(400).json(badRequest(400, "Tên người dùng đã tồn tại trên hệ thống!!!"));
    }
    const checkemail = await getByOptions$2({
      field: "email",
      payload: email
    });
    if (checkemail) {
      return res.status(400).json(badRequest(400, "Địa chỉ email đã tồn tại trên hệ thống!!!"));
    }
    const checkphone = await getByOptions$2({
      field: "phone_number",
      payload: phone_number
    });
    if (checkphone) {
      return res.status(400).json(badRequest(400, "Số điện thoại đã tồn tại trên hệ thống!!!"));
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await create$g({
      name,
      email,
      phone_number,
      password: hashedPassword,
      role_id: role_id ? role_id : "655b87021ac3962a68ccf1b5"
    });
    const values = {
      _id: newUser._id,
      name: newUser.name,
      role_id: newUser.role_id,
      phone_number,
      email: newUser.email,
      createAt: newUser.createdAt,
      updatedAt: newUser.updatedAt
    };
    const token = await generateToken(values);
    res.status(200).json(successfully({ ...values, token }, "Thêm thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const registerWithOTP = async (req, res) => {
  try {
    const { phone_number, role_id } = req.body;
    const checkUser = await getByOptions$2({
      field: "phone_number",
      payload: phone_number
    });
    if (checkUser) {
      return res.status(400).json(badRequest(400, "Số điện thoại đã tồn tại trên hệ thống!!!"));
    }
    await create$g({
      name: phone_number,
      phone_number,
      role_id: role_id ? role_id : "655b87021ac3962a68ccf1b5"
    });
    const { otpCode, otpExpiration } = generateOtp();
    const formatPhoneNumber = `+84${phone_number.slice(1, 10)}`;
    sendOtp(otpCode, formatPhoneNumber);
    const checkOtp = await getByOptions$1({
      field: "phone_number",
      payload: phone_number
    });
    if (!checkOtp) {
      await create$f({
        otp: otpCode,
        phone_number,
        expireAt: otpExpiration
      });
    } else {
      await update$i(checkOtp.id, {
        otp: otpCode,
        expireAt: otpExpiration
      });
    }
    return res.status(200).json({
      error: false,
      message: "Chúng tôi đã gửi một mã otp về số điện thoại của bạn, để xác minh rằng đây là số điện thoại của bạn hãy nhập mã xác minh."
    });
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const update$b = async (req, res) => {
  try {
    const { error } = userSchema.validate(req.body);
    if (error) {
      return res.status(400).json(badRequest(400, error.details[0].message));
    }
    const user = await update$j(req.params.id, req.body, {
      new: true
    });
    if (!user) {
      return res.status(400).json(badRequest(400, "Cập nhật không thành công !!!"));
    }
    res.status(200).json(successfully(user, "Cập nhật thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const remove$9 = async (req, res) => {
  try {
    const user = await remove$h(req.params.id);
    if (!user) {
      return res.status(400).json(badRequest(400, "Xóa không thành công !!!"));
    }
    res.status(200).json(successfully(user, "Xóa thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const bookingLimit = async (req, res) => {
  try {
    const { id: user_id } = req.params;
    const { pitch_id } = req.query;
    const currentDate = /* @__PURE__ */ new Date();
    const bookings = await BookingModel.find({
      user_id,
      pitch_id,
      createdAt: {
        $gte: startOfDay(currentDate),
        $lt: endOfDay(currentDate)
      },
      status: { $ne: "cancel" }
    });
    res.status(200).json(successfully(bookings, "Check Booking Limit Success!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const changePassword = async (req, res) => {
  try {
    const { password, new_password, user_id } = req.body;
    const checkUser = await getById$f(user_id);
    const isMatch = await bcrypt.compare(password, checkUser.password);
    if (!isMatch) {
      return res.status(200).json(
        badRequest(
          400,
          "Mật khẩu hiện tại không chính xác, vui lòng nhập lại!"
        )
      );
    }
    const hashedPassword = await bcrypt.hash(new_password, 10);
    await update$j(checkUser._id, {
      password: hashedPassword
    });
    res.status(200).json(successfully([], "Đổi mật khẩu thành công!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getAll$8 = async (req, res) => {
  try {
    const otps = await getAll$f();
    if (!otps) {
      return res.status(400).json(badRequest(400, "Lấy dữ liệu thất bại"));
    }
    res.status(200).json(successfully(otps, "Lấy dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getById$7 = async (req, res) => {
  try {
    const otp = await getById$e(req.params.id);
    if (!otp) {
      return res.status(400).json(badRequest(400, "Lấy dữ liệu thất bại"));
    }
    res.status(200).json(successfully(otp, "Lấy dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const create$9 = async (req, res) => {
  try {
    const { error } = otpSchema.validate(req.body);
    if (error) {
      return res.status(400).json(badRequest(400, error.details[0].message));
    }
    const otp = await create$f(req.body);
    if (!otp) {
      return res.status(400).json(badRequest(400, "Thêm không thành công !!!"));
    }
    res.status(200).json(successfully(otp, "Thêm thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const update$a = async (req, res) => {
  try {
    const otp = await update$i(req.params.id, req.body, {
      new: true
    });
    if (!otp) {
      return res.status(400).json(badRequest(400, "Cập nhật không thành công !!!"));
    }
    res.status(200).json(successfully(otp, "Cập nhật thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const remove$8 = async (req, res) => {
  try {
    const otp = await remove$g(req.params.id);
    if (!otp) {
      return res.status(400).json(badRequest(400, "Xóa không thành công !!!"));
    }
    res.status(200).json(successfully(otp, "Xóa thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const bannerSchema = new Schema$2(
  {
    url: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true
    }
  },
  {
    versionKey: false,
    timestamps: true
  }
);
const Banner = mongoose.model("Banner", bannerSchema);
const getAll$7 = async () => {
  return Banner.find();
};
const getById$6 = async (bannerId) => {
  return Banner.findById(bannerId);
};
const createDT = async (data) => {
  const banner = new Banner(data);
  return await banner.save();
};
const update$9 = async (banner) => {
  const { id, ...body } = banner;
  return await Banner.findByIdAndUpdate(banner.id, body, { new: true });
};
const remove$7 = async (bannerId) => {
  return await Banner.findByIdAndDelete(bannerId);
};
const getAll$6 = async (req, res) => {
  try {
    const banner = await getAll$7();
    res.status(200).json(successfully(banner, "Lấy dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getOne = async (req, res) => {
  try {
    const banner = await getById$6(req.params.id);
    res.json({
      meassge: "Lây dữ liệu thành công",
      data: banner
    });
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const create$8 = async (req, res) => {
  try {
    const { error } = bannerSchema$1.validate(req.body);
    if (error) {
      return res.status(400).json(badRequest(400, error.details[0].message));
    }
    const banner = await createDT(req.body);
    if (!banner) {
      return res.status(400).json(badRequest(400, "Thêm không thành công !!!"));
    }
    res.status(200).json(successfully(banner, "Thêm thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const update$8 = async (req, res) => {
  try {
    const { error } = bannerSchema$1.validate(req.body);
    if (error) {
      return res.status(400).json(badRequest(400, error.details[0].message));
    }
    const banner = await update$9({ ...req.body, id: req.params.id });
    if (!banner) {
      return res.status(400).json(badRequest(400, "Cập nhật không thành công !!!"));
    }
    res.status(200).json(successfully(banner, "Cập nhật thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const remove$6 = async (req, res) => {
  try {
    const banner = await remove$7(req.params.id);
    if (!banner) {
      return res.status(400).json(badRequest(400, "Xóa không thành công !!!"));
    }
    res.status(200).json(successfully(banner, "Xóa thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getAll$5 = async (req, res) => {
  try {
    const service = await getAll$b(req.query);
    res.status(200).json(successfully(service, "Lấy dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getById$5 = async (req, res) => {
  try {
    const { idUser } = req.params;
    const service = await getAll$b();
    const results = service.filter((item) => item.admin_pitch_id === idUser);
    res.status(200).json(successfully(results, "Lấy dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const create$7 = async (req, res) => {
  try {
    const { error } = serviceSchema.validate(req.body);
    if (error) {
      return res.status(400).json(badRequest(400, error.details[0].message));
    }
    const service = await create$c(req.body);
    await addIdPitch(service);
    if (!service) {
      return res.status(400).json(badRequest(400, "Thêm không thành công !!!"));
    }
    res.status(200).json(successfully(service, "Thêm thành công !!!"));
    console.log(service);
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const update$7 = async (req, res) => {
  try {
    const { error } = serviceSchema.validate(req.body);
    if (error) {
      return res.status(400).json(badRequest(400, error.details[0].message));
    }
    const service = await update$e({
      id: req.params.id,
      ...req.body
    });
    if (!service) {
      return res.status(400).json(badRequest(400, "Cập nhật không thành công !!!"));
    }
    res.status(200).json(successfully(service, "Cập nhật thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const remove$5 = async (req, res) => {
  try {
    const service = await remove$c(req.params.id);
    if (!service) {
      return res.status(400).json(badRequest(400, "Xóa không thành công !!!"));
    }
    await removeIdPitch(service);
    res.status(200).json(successfully(service, "Xóa thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getAllPost = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 6,
      _sort = "createdAt",
      _order = "desc",
      ...params
    } = req.query;
    const options2 = {
      page,
      limit,
      sort: {
        [_sort]: _order === "desc" ? -1 : 1
      },
      ...params,
      customLabels: {
        docs: "data"
      }
    };
    const posts = await getAllPost$1(options2);
    if (!posts || posts.length === 0) {
      return res.status(404).json(badRequest(404, "Không có dữ liệu!"));
    }
    const postsWithVietnamTime = {
      ...posts,
      data: posts.data.map((post) => ({
        ...post.toObject(),
        createdAt: moment(post.createdAt).utcOffset(7).format("DD/MM/YYYY - HH:mm"),
        updatedAt: moment(post.updatedAt).utcOffset(7).format("DD/MM/YYYY - HH:mm")
      }))
    };
    res.status(200).json(successfully(postsWithVietnamTime, "Lấy dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getPost = async (req, res) => {
  try {
    const { idPost } = req.params;
    const post = await getPost$1(idPost);
    if (!post) {
      return res.status(404).json(badRequest(404, "Không có dữ liệu!"));
    }
    const postOneWithVietnamTime = {
      ...post.toObject(),
      createdAt: moment(post.createdAt).utcOffset(7).format("DD/MM/YYYY - HH:mm"),
      updatedAt: moment(post.updatedAt).utcOffset(7).format("DD/MM/YYYY - HH:mm")
    };
    res.status(200).json(successfully(postOneWithVietnamTime, "Lấy dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getCommentPost = async (req, res) => {
  try {
    const { idPost } = req.params;
    const post = await getPost$1(idPost);
    if (!post) {
      return res.status(404).json(badRequest(404, "Không có dữ liệu!"));
    }
    const commentData = await Promise.all(
      post.comment_id.map(async (commentId) => {
        const comment = await getComment$1(commentId);
        const commentWithVietnamTime = {
          _id: comment._id,
          id_user: comment.id_user,
          content: comment.content,
          id_post: comment.id_post,
          createdAt: moment(comment.createdAt).utcOffset(7).format("DD/MM/YYYY - HH:mm"),
          updatedAt: moment(comment.updatedAt).utcOffset(7).format("DD/MM/YYYY - HH:mm")
        };
        return commentWithVietnamTime;
      })
    );
    const formattedPost = {
      _id: post._id,
      title: post.title,
      description: post.description,
      images: post.images,
      comment_id: commentData,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt
    };
    res.status(200).json(successfully(formattedPost, "Lấy dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getPostByUser = async (req, res) => {
  try {
    const { _id: userId } = req.user;
    const posts = await getPostByUser$1(userId);
    if (!posts || posts.length === 0) {
      return res.status(404).json(badRequest(404, "Không có dữ liệu!"));
    }
    res.status(200).json(successfully(posts, "Lấy dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const createPost = async (req, res) => {
  try {
    const { error } = postSchema.validate(
      { ...req.body },
      {
        abortEarly: false
      }
    );
    if (error) {
      const errors = error.details.map((err) => err.message);
      return res.status(400).json(badRequest(400, errors));
    }
    const post = await createPost$1({ ...req.body });
    if (!post) {
      return res.status(400).json(badRequest(400, "Thêm dữ liệu thất bại!"));
    }
    res.status(200).json(successfully(post, "Thêm dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const updatePost = async (req, res) => {
  try {
    const { idPost } = req.params;
    const { error } = postSchema.validate(
      { ...req.body },
      {
        abortEarly: false
      }
    );
    if (error) {
      const errors = error.details.map((err) => err.message);
      return res.status(400).json(badRequest(400, errors));
    }
    const post = await updatePost$1({ idPost, ...req.body });
    if (!post) {
      return res.status(400).json(badRequest(400, "Sửa dữ liệu thất bại!"));
    }
    res.status(200).json(successfully(post, "Sửa dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const deletePost = async (req, res) => {
  try {
    const { idPost } = req.params;
    const post = await deletePost$1(idPost);
    if (!post) {
      return res.status(400).json(badRequest(400, "Xóa dữ liệu thất bại!"));
    }
    res.status(200).json(successfully(post, "Xóa dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getAllComment = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 7,
      _sort = "createdAt",
      _order = "asc",
      ...params
    } = req.query;
    const options2 = {
      page,
      limit,
      sort: {
        [_sort]: _order === "desc" ? -1 : 1
      },
      ...params,
      customLabels: {
        docs: "data"
      }
    };
    const comments = await getAllComment$1(options2);
    if (!comments || comments.length === 0) {
      return res.status(404).json(badRequest(404, "Không có dữ liệu!"));
    }
    console.log("CommentAll", comments);
    const commentsWithVietnamTime = {
      ...comments,
      data: comments.data.map((comment) => ({
        ...comment.toObject(),
        createdAt: moment(comment.createdAt).utcOffset(7).format("DD/MM/YYYY - HH:mm"),
        updatedAt: moment(comment.updatedAt).utcOffset(7).format("DD/MM/YYYY - HH:mm")
      }))
    };
    res.status(200).json(successfully(commentsWithVietnamTime, "Lấy dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getComment = async (req, res) => {
  try {
    const { idComment } = req.params;
    const comment = await getComment$1(idComment);
    if (!comment) {
      return res.status(404).json(badRequest(404, "Không có dữ liệu!"));
    }
    res.status(200).json(successfully(comment, "Lấy dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getCommentByPost = async (req, res) => {
  try {
    const { idPost } = req.params;
    const comments = await getCommentByPost$1(idPost);
    if (!comments || comments.length === 0) {
      return res.status(404).json(badRequest(404, "Không có dữ liệu!"));
    }
    res.status(200).json(successfully(comments, "Lấy dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const createComment = async (req, res) => {
  try {
    const { _id: id_user } = req.user;
    const { error } = commentSchema.validate(
      { id_user, ...req.body },
      {
        abortEarly: false
      }
    );
    if (error) {
      const errors = error.details.map((err) => err.message);
      return res.status(400).json(badRequest(400, errors));
    }
    const comment = await createComment$1({
      id_user,
      ...req.body
    });
    if (!comment) {
      return res.status(400).json(badRequest(400, "Bình luận thất bại!"));
    }
    if (comment.id_post) {
      await Post.findByIdAndUpdate(comment.id_post, {
        $addToSet: { comment_id: comment._id }
      });
    }
    if (comment.id_pitch) {
      await Pitch.findByIdAndUpdate(comment.id_pitch, {
        $addToSet: { comment_id: comment._id }
      });
    }
    const commentWithVietnamTime = {
      ...comment.toObject(),
      createdAt: moment(comment.createdAt).utcOffset(7).format("DD/MM/YYYY - HH:mm"),
      updatedAt: moment(comment.updatedAt).utcOffset(7).format("DD/MM/YYYY - HH:mm"),
      user: req.user
    };
    res.status(200).json(successfully(commentWithVietnamTime, "Bình luận thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const updateComment = async (req, res) => {
  try {
    const { idComment } = req.params;
    const { _id: id_user } = req.user;
    const { error } = commentSchema.validate(
      { id_user, ...req.body },
      {
        abortEarly: false
      }
    );
    if (error) {
      const errors = error.details.map((err) => err.message);
      return res.status(400).json(badRequest(400, errors));
    }
    const comment = await updateComment$1({
      idComment,
      id_user,
      ...req.body
    });
    if (!comment) {
      return res.status(400).json(badRequest(400, "Sửa bình luận thất bại!"));
    }
    res.status(200).json(successfully(comment, "Sửa bình luận thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const deleteComment = async (req, res) => {
  try {
    const { idComment } = req.params;
    const comment = await deleteComment$1(idComment);
    if (!comment) {
      return res.status(400).json(badRequest(400, "Xóa bình luận thất bại!"));
    }
    if (comment.id_post) {
      await Post.findByIdAndUpdate(comment.id_post, {
        $pull: { comment_id: comment._id }
      });
    }
    if (comment.id_pitch) {
      await Pitch.findByIdAndUpdate(comment.id_post, {
        $pull: { comment_id: comment._id }
      });
    }
    res.status(200).json(successfully(comment, "Xóa bình luận thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getAll$4 = async (req, res) => {
  try {
    const childrenPitchs = await getAll$e();
    if (!childrenPitchs || childrenPitchs.length === 0) {
      return res.status(400).json(badRequest(400, "Không có sân nào cả"));
    }
    res.status(200).json(successfully(childrenPitchs, "lấy dữ lệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getByID$1 = async (req, res) => {
  try {
    const childrenPitch = await getById$d(req.params.id);
    if (!childrenPitch) {
      return res.status(400).json(badRequest(400, "Không có sân nào cả"));
    }
    res.status(200).json(successfully(childrenPitch, "lấy dữ lệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const create$6 = async (req, res) => {
  try {
    const { idParentPitch } = req.body;
    const { error } = childrenPitchSchema.validate(req.body);
    if (error) {
      return res.status(400).json(badRequest(400, error.details[0].message));
    }
    const pitch = await getOnePitch(idParentPitch);
    const childrenPitchs = await getChildrenPitchsByParent$1(
      idParentPitch
    );
    if (childrenPitchs.length >= pitch.numberPitch) {
      return res.status(400).json(badRequest(400, "Đã tạo đủ số lượng sân đăng ký !!!"));
    }
    const childrentPitch = await create$e(req.body);
    if (!childrentPitch) {
      return res.status(400).json(badRequest(400, "Thêm không thành công !!!"));
    }
    res.status(200).json(successfully(childrentPitch, "Thêm thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const update$6 = async (req, res) => {
  try {
    const { error } = childrenPitchSchema.validate(req.body);
    if (error) {
      return res.status(400).json(badRequest(400, error.details[0].message));
    }
    const childrenPitch = await update$h(
      req.params.id,
      req.body
    );
    if (!childrenPitch) {
      return res.status(400).json(badRequest(400, "Cập nhật không thành công !!!"));
    }
    res.status(200).json(successfully(childrenPitch, "Cập nhật thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const remove$4 = async (req, res) => {
  try {
    const childrenPitch = await remove$f(req.params.id);
    if (!childrenPitch) {
      return res.status(400).json(badRequest(400, "Xóa không thành công !!!"));
    }
    res.status(200).json(successfully(childrenPitch, "Xóa thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getChildrenPitchsByParent = async (req, res) => {
  try {
    const { id: idParentPitch } = req.params;
    const { date } = req.query;
    const newDate = date ? date : format(/* @__PURE__ */ new Date(), "yyyy-MM-dd");
    const dateObject = parse(newDate, "yyyy-MM-dd", /* @__PURE__ */ new Date());
    const pastDate = subDays(dateObject, 29);
    const formattedPastDate = format(pastDate, "yyyy-MM-dd");
    const childrenPitchs = await getChildrenPitchsByParent$1(
      idParentPitch
    );
    if (!childrenPitchs || childrenPitchs.length === 0) {
      return res.status(200).json(successfully([], "Không dữ liệu!"));
    }
    const shiftsDefault = await getListByOptions({
      field: "$and",
      payload: [{ default: true }, { id_pitch: idParentPitch }]
    });
    if (!shiftsDefault || shiftsDefault.length === 0) {
      return res.status(200).json(successfully(childrenPitchs, "Không dữ liệu!"));
    }
    const newChildrenPitchs = [];
    for (const childrenPitch of childrenPitchs) {
      try {
        const shifts = await getListByOptions({
          field: "$and",
          payload: [
            { id_chirlden_pitch: childrenPitch._id },
            { isCancelBooking: { $ne: true } },
            {
              $or: [
                { date: { $in: [newDate] } },
                {
                  is_booking_month: true,
                  date: {
                    $elemMatch: {
                      $gte: formattedPastDate,
                      $lte: newDate
                    }
                  }
                }
              ]
            }
          ]
        });
        const results = shiftsDefault.map((item) => ({
          ...item._doc,
          id_chirlden_pitch: childrenPitch._id,
          date: (shifts.find(
            (shift) => shift.number_shift === item.number_shift || shift.number_shift === null
          ) || item).date,
          status_shift: !!shifts.find(
            (shift) => shift.number_shift === item.number_shift || shift.number_shift === null
          ) || false,
          default: !shifts.find(
            (shift) => shift.number_shift === item.number_shift || shift.number_shift === null
          ),
          _id: (shifts.find(
            (shift) => shift.number_shift === item.number_shift || shift.number_shift === null
          ) || item)._id,
          is_booking_month: (shifts.find(
            (shift) => shift.number_shift === item.number_shift || shift.number_shift === null
          ) || item).is_booking_month
        }));
        newChildrenPitchs.push({ ...childrenPitch._doc, shifts: results });
      } catch (error) {
        return res.status(500).json(serverError(error.message));
      }
    }
    res.status(200).json(successfully(newChildrenPitchs, "lấy dữ lệu thành công!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getChildrenPitchsByParentBookingMonth = async (req, res) => {
  try {
    const { id: idParentPitch } = req.params;
    const { date } = req.query;
    const newDate = date ? date : format(/* @__PURE__ */ new Date(), "yyyy-MM-dd");
    const dateObject = parse(newDate, "yyyy-MM-dd", /* @__PURE__ */ new Date());
    const futureDate = addDays(dateObject, 29);
    const pastDate = subDays(dateObject, 29);
    const formattedCurrentDate = format(dateObject, "yyyy-MM-dd");
    const formattedFutureDate = format(futureDate, "yyyy-MM-dd");
    const formattedPastDate = format(pastDate, "yyyy-MM-dd");
    const childrenPitchs = await getChildrenPitchsByParent$1(
      idParentPitch
    );
    if (!childrenPitchs || childrenPitchs.length === 0) {
      return res.status(400).json(badRequest(400, "Không dữ liệu!"));
    }
    const newChildrenPitchs = [];
    for (const childrenPitch of childrenPitchs) {
      const bookedShifts = await getListByOptions({
        field: "$or",
        payload: [
          {
            id_chirlden_pitch: childrenPitch._id,
            isCancelBooking: { $ne: true },
            date: {
              $elemMatch: {
                $gte: formattedCurrentDate,
                $lte: formattedFutureDate
              }
            }
          },
          {
            id_chirlden_pitch: childrenPitch._id,
            isCancelBooking: { $ne: true },
            date: {
              $elemMatch: {
                $gte: formattedPastDate,
                $lte: formattedCurrentDate
              }
            },
            is_booking_month: true
          }
        ]
      });
      if (bookedShifts && bookedShifts.length > 0) {
        newChildrenPitchs.push({ ...childrenPitch._doc, isBooking: true });
      } else {
        newChildrenPitchs.push({ ...childrenPitch._doc, isBooking: false });
      }
    }
    res.status(200).json(successfully(newChildrenPitchs, "lấy dữ lệu thành công!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.USER_EMAIL,
    pass: process.env.PASS_EMAIL
  }
});
const locationJson$2 = JSON.parse(fs.readFileSync("locations.json"));
const getAll$3 = async (req, res) => {
  try {
    const shifts = await getAll$d();
    if (!shifts || shifts.length === 0) {
      return res.status(404).json(badRequest(400, "Không có dữ liệu!"));
    }
    res.status(200).json(successfully(shifts, "lấy dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getByID = async (req, res) => {
  try {
    const shift = await getById$c(req.params.id);
    if (!shift) {
      return res.status(400).json(badRequest(400, "Không có sân nào cả"));
    }
    res.status(200).json(successfully(shift, "lấy dữ lệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const create$5 = async (req, res) => {
  try {
    const data = req.body;
    const { error } = shiftSchema.validate(data);
    if (error) {
      return res.status(400).json(badRequest(400, error.details[0].message));
    }
    const newDate = new Date(data.date[0]);
    const pastDate = subDays(newDate, 30);
    const formattedCurrentDate = format(newDate, "yyyy-MM-dd");
    const formattedPastDate = format(pastDate, "yyyy-MM-dd");
    const bookedShifts = await getListByOptions({
      field: "$and",
      payload: [
        {
          date: {
            $elemMatch: { $gte: formattedPastDate, $lte: formattedCurrentDate }
          }
        },
        { id_chirlden_pitch: data.id_chirlden_pitch },
        { is_booking_month: true },
        { isCancelBooking: { $ne: true } },
        {
          number_shift: {
            $in: [data.number_shift, null]
          }
        }
      ]
    });
    if (bookedShifts && bookedShifts.length > 0) {
      return res.status(400).json({
        error: true,
        statusCode: 400,
        message: "Ca bạn đặt đã được đặt trước đó!! Vui lòng chọn ca khác!!!",
        data: bookedShifts
      });
    }
    const shift = await creat(data);
    if (!shift) {
      return res.status(400).json(badRequest(400, "Thêm không thành công !!!"));
    }
    res.status(200).json(successfully(shift, "Thêm thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const update$5 = async (req, res) => {
  try {
    const shift = await update$g(req.params.id, req.body);
    if (!shift) {
      return res.status(400).json(badRequest(400, "Cập nhật không thành công !!!"));
    }
    res.status(200).json(successfully(shift, "Cập nhật thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const remove$3 = async (req, res) => {
  try {
    const shift = await remove$e(req.params.id);
    if (!shift) {
      return res.status(400).json(badRequest(400, "Xóa không thành công !!!"));
    }
    res.status(200).json(successfully(shift, "Xóa thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const find_opponent = async (req, res) => {
  try {
    const { id: shift_id } = req.params;
    const { find_opponent: find_opponent2 } = req.body;
    const shift = await update$g(shift_id, { find_opponent: find_opponent2 });
    if (!shift) {
      return res.status(400).json(badRequest(400, "Cập nhật thất bại!"));
    }
    res.status(200).json(successfully(shift, "Thay đổi dữ liệu thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getAllShiftFindOpponent = async (req, res) => {
  try {
    const { districtId, wardId } = req.query;
    const today = format(/* @__PURE__ */ new Date(), "yyyy-MM-dd");
    const shifts = await getListByOptionsPopulate({
      field: "$and",
      payload: [
        { find_opponent: "Find" },
        { isCancelBooking: { $ne: true } },
        { date: { $elemMatch: { $gte: today } } }
      ]
    });
    if (!shifts || shifts.length === 0) {
      return res.status(404).json(badRequest(404, "Không có dữ liệu!"));
    }
    const newShifts = [];
    for (const shift of shifts) {
      const bookingDb = await getByField$1({
        shift_id: shift._id.toString()
      });
      newShifts.push({ ...shift._doc, user: bookingDb == null ? void 0 : bookingDb.user_booking });
    }
    let newData = [];
    if (districtId) {
      const wardIdsInDistricts = locationJson$2.wards.filter((ward) => ward.parent === districtId).map((ward) => ward.id);
      const shiftsClone = newShifts.filter(
        (item) => wardIdsInDistricts.includes(item.id_pitch.location_id)
      );
      newData = [...shiftsClone];
    } else if (wardId) {
      const shiftsClone = newShifts.filter(
        (item) => item.id_pitch.location_id === wardId
      );
      newData = [...shiftsClone];
    } else {
      newData = [...newShifts];
    }
    res.status(200).json(successfully(newData, "Lấy dữ liệu thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getAllShiftFindOpponentByPitch = async (req, res) => {
  try {
    const { id: id_pitch } = req.params;
    const today = format(/* @__PURE__ */ new Date(), "yyyy-MM-dd");
    const shifts = await getListByOptionsPopulate({
      field: "$and",
      payload: [
        { id_pitch },
        { find_opponent: "Find" },
        { isCancelBooking: { $ne: true } },
        { date: { $elemMatch: { $gte: today } } }
      ]
    });
    if (!shifts || shifts.length === 0) {
      return res.status(404).json(badRequest(404, "Không có dữ liệu!"));
    }
    const newShifts = [];
    for (const shift of shifts) {
      const bookingDb = await getByField$1({
        shift_id: shift._id.toString()
      });
      newShifts.push({ ...shift._doc, user: bookingDb == null ? void 0 : bookingDb.user_booking });
    }
    res.status(200).json(successfully(newShifts, "Lấy dữ liệu thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const matchOpponent = async (req, res) => {
  try {
    const {
      idUserFindOpponent,
      email,
      phone_number,
      nameUserFindOpponent,
      currentUserEmail,
      currentUserPhone,
      currentUserName,
      currentUserId
    } = req.body;
    const currentUser = {
      _id: currentUserId,
      name: currentUserName,
      email: currentUserEmail,
      phone_number: currentUserPhone
    };
    if (currentUser._id !== idUserFindOpponent) {
      if (email) {
        const sendEmail = async (nameUserSendEmail, email2, name, phone_number2) => {
          await transporter.sendMail({
            from: {
              name: "FSport",
              address: process.env.USER_EMAIL
            },
            to: email2,
            subject: "Tìm được đối sân bóng!",
            text: `Chào ${nameUserSendEmail}. Bạn đã tìm được đối bóng. Họ và Tên: ${name}  -  SĐT: ${phone_number2}. Vui lòng liên lạc để ghép kèo!`,
            html: `
            <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title></title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
      
          .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          }
      
          header {
            background-color: #3498db;
            color: #ffffff;
            text-align: center;
            padding: 20px;
          }
      
          h1 {
            margin: 0;
          }
      
          main {
            padding: 20px;
          }
      
          p {
            margin-bottom: 20px;
          }
      
          button {
            display: inline-block;
            padding: 10px 20px;
            background-color: #3498db;
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
          }
      
          footer {
            text-align: center;
            padding: 10px;
            background-color: #f1f1f1;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <h1>FSport</h1>
          </header>
          <main>
          <p>Xin chào ${nameUserSendEmail},</p><p>Bạn đã tìm được đối bóng.</p><p>Thông tin liên lạc:</p><p>Họ và Tên: ${name}  -  SĐT: ${phone_number2}</p><p>Vui lòng liên lạc cho đối thủ của bạn để xác nhận</p>
          </main>
          <footer>
            <p>© 2023 FSport</p>
          </footer>
        </div>
      </body>
      </html>`
          });
        };
        sendEmail(
          currentUser.name,
          currentUser.email,
          nameUserFindOpponent,
          phone_number
        );
        sendEmail(
          nameUserFindOpponent,
          email,
          currentUser.name,
          currentUser.phone_number
        );
        res.status(200).json({
          error: false,
          meassge: "Ghép kèo thành công!"
        });
      } else {
        res.status(400).json(badRequest(400, "Không có email!"));
      }
    } else {
      res.status(400).json(badRequest(400, "Bạn không thể tự ghép kèo với mình!"));
    }
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getAllShiftByChirldrenPitch = async (req, res) => {
  try {
    const { id: id_chirlden_pitch } = req.params;
    const { date, id_pitch } = req.query;
    const newDate = date ? date : format(/* @__PURE__ */ new Date(), "yyyy-MM-dd");
    const shiftsDefault = await getListByOptions({
      field: "$and",
      payload: [{ default: true }, { id_pitch }]
    });
    if (!shiftsDefault || shiftsDefault.length === 0) {
      return res.status(404).json(badRequest(404, "Không có shifts default!"));
    }
    const dateObject = parse(newDate, "yyyy-MM-dd", /* @__PURE__ */ new Date());
    const pastDate = subDays(dateObject, 29);
    const formattedPastDate = format(pastDate, "yyyy-MM-dd");
    const shifts = await getListByOptions({
      field: "$and",
      payload: [
        { id_chirlden_pitch },
        { isCancelBooking: { $ne: true } },
        {
          $or: [
            { date: { $in: [newDate] } },
            {
              is_booking_month: true,
              date: {
                $elemMatch: {
                  $gte: formattedPastDate,
                  $lte: newDate
                }
              }
            }
          ]
        }
      ]
    });
    const results = shiftsDefault.map((item) => ({
      ...item._doc,
      id_chirlden_pitch,
      date: (shifts.find(
        (shift) => shift.number_shift === item.number_shift || shift.number_shift === null
      ) || item).date,
      status_shift: !!shifts.find(
        (shift) => shift.number_shift === item.number_shift || shift.number_shift === null
      ) || false,
      default: !shifts.find(
        (shift) => shift.number_shift === item.number_shift || shift.number_shift === null
      ),
      _id: (shifts.find(
        (shift) => shift.number_shift === item.number_shift || shift.number_shift === null
      ) || item)._id,
      is_booking_month: (shifts.find(
        (shift) => shift.number_shift === item.number_shift || shift.number_shift === null
      ) || item).is_booking_month
    }));
    res.status(200).json(successfully(results, "lấy dữ lệu thành công!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const changeStatusShift = async (req, res) => {
  try {
    const { id: shift_id } = req.params;
    const { status_shift } = req.body;
    const shift = await update$g(shift_id, { status_shift });
    if (!shift) {
      return res.status(400).json(badRequest(400, "Cập nhật thất bại!"));
    }
    res.status(200).json(successfully(shift, "Thay đổi dữ liệu thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const createShiftDefault = async (req, res) => {
  try {
    const data = req.body;
    const { error } = shiftSchema.validate(data);
    if (error) {
      return res.status(400).json(badRequest(400, error.details[0].message));
    }
    const shift = await creat(data);
    if (!shift) {
      return res.status(400).json(badRequest(400, "Thêm không thành công !!!"));
    }
    const shifts = await getListByOptions({
      field: "$and",
      payload: [{ default: true }, { id_pitch: shift.id_pitch }]
    });
    const totalPrice = shifts.reduce((sum, shift2) => sum + shift2.price, 0);
    const averagePrice = totalPrice / shifts.length;
    await updatePitch({
      id: shift.id_pitch,
      average_price: averagePrice
    });
    res.status(200).json(successfully(shift, "Thêm thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const updateShiftDefault = async (req, res) => {
  try {
    const shift = await update$g(req.params.id, req.body);
    if (!shift) {
      return res.status(400).json(badRequest(400, "Cập nhật không thành công !!!"));
    }
    const shifts = await getListByOptions({
      field: "$and",
      payload: [{ default: true }, { id_pitch: shift.id_pitch }]
    });
    const totalPrice = shifts.reduce((sum, shift2) => sum + shift2.price, 0);
    const averagePrice = totalPrice / shifts.length;
    await updatePitch({
      id: shift.id_pitch,
      average_price: averagePrice
    });
    res.status(200).json(successfully(shift, "Cập nhật thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const deleteShiftDefault = async (req, res) => {
  try {
    const shift = await remove$e(req.params.id);
    if (!shift) {
      return res.status(400).json(badRequest(400, "Xóa không thành công !!!"));
    }
    const shifts = await getListByOptions({
      field: "$and",
      payload: [{ default: true }, { id_pitch: shift.id_pitch }]
    });
    const totalPrice = shifts.reduce((sum, shift2) => sum + shift2.price, 0);
    const averagePrice = totalPrice / shifts.length;
    await updatePitch({
      id: shift.id_pitch,
      average_price: averagePrice
    });
    res.status(200).json(successfully(shift, "Xóa thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getAllShiftDefaultByPitch = async (req, res) => {
  try {
    const { id: id_pitch } = req.params;
    const shifts = await getListByOptions({
      field: "$and",
      payload: [{ default: true }, { id_pitch }]
    });
    if (!shifts || shifts.length === 0) {
      return res.status(200).json(successfully([], "lấy dữ lệu thành công!"));
    }
    res.status(200).json(successfully(shifts, "lấy dữ lệu thành công!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const bookMultipleDay = async (req, res) => {
  try {
    const data = req.body;
    const { error } = shiftSchema.validate(data);
    if (error) {
      return res.status(400).json(badRequest(400, error.details[0].message));
    }
    const bookedShifts = await getListByOptions({
      field: "$and",
      payload: [
        { date: { $in: data.date } },
        { isCancelBooking: { $ne: true } },
        { id_chirlden_pitch: data.id_chirlden_pitch },
        { number_shift: data.number_shift }
      ]
    });
    if (bookedShifts && bookedShifts.length > 0) {
      return res.status(400).json({
        error: true,
        statusCode: 400,
        message: "Trong số ca bạn đặt đã có ca được đặt trước đó!! Vui lòng chọn ca khác!!!",
        data: bookedShifts
      });
    }
    const shift = await creat(data);
    if (!shift) {
      return res.status(400).json(badRequest(400, "Thêm không thành công !!!"));
    }
    res.status(200).json(successfully(shift, "Thêm thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const bookOneShiftFullMonth = async (req, res) => {
  try {
    const data = req.body;
    const { error } = shiftSchema.validate(data);
    if (error) {
      return res.status(400).json(badRequest(400, error.details[0].message));
    }
    const currentDate = /* @__PURE__ */ new Date();
    const futureDate = addDays(currentDate, 29);
    const pastDate = subDays(currentDate, 29);
    const formattedCurrentDate = format(currentDate, "yyyy-MM-dd");
    const formattedFutureDate = format(futureDate, "yyyy-MM-dd");
    const formattedPastDate = format(pastDate, "yyyy-MM-dd");
    const bookedShifts = await getListByOptions({
      field: "$or",
      payload: [
        {
          id_chirlden_pitch: data.id_chirlden_pitch,
          isCancelBooking: { $ne: true },
          number_shift: data.number_shift,
          date: {
            $elemMatch: {
              $gte: formattedCurrentDate,
              $lte: formattedFutureDate
            }
          }
        },
        {
          id_chirlden_pitch: data.id_chirlden_pitch,
          isCancelBooking: { $ne: true },
          number_shift: data.number_shift,
          date: {
            $elemMatch: { $gte: formattedPastDate, $lte: formattedCurrentDate }
          },
          is_booking_month: true
        }
      ]
    });
    if (bookedShifts && bookedShifts.length > 0) {
      return res.status(400).json({
        error: true,
        statusCode: 400,
        message: "Ca bạn đặt trong một tháng đã có ca được đặt trước!! Vui lòng chọn ca khác!!!",
        data: bookedShifts
      });
    }
    data.date = [formattedCurrentDate];
    const shift = await creat(data);
    if (!shift) {
      return res.status(400).json(badRequest(400, "Thêm không thành công !!!"));
    }
    res.status(200).json(successfully(shift, "Thêm thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const bookChildrenPicthFullMonth = async (req, res) => {
  try {
    const data = req.body;
    const { error } = shiftSchema.validate(data);
    if (error) {
      return res.status(400).json(badRequest(400, error.details[0].message));
    }
    const currentDate = /* @__PURE__ */ new Date();
    const futureDate = addDays(currentDate, 29);
    const pastDate = subDays(currentDate, 29);
    const formattedCurrentDate = format(currentDate, "yyyy-MM-dd");
    const formattedFutureDate = format(futureDate, "yyyy-MM-dd");
    const formattedPastDate = format(pastDate, "yyyy-MM-dd");
    const bookedShifts = await getListByOptions({
      field: "$or",
      payload: [
        {
          id_chirlden_pitch: data.id_chirlden_pitch,
          isCancelBooking: { $ne: true },
          date: {
            $elemMatch: {
              $gte: formattedCurrentDate,
              $lte: formattedFutureDate
            }
          }
        },
        {
          id_chirlden_pitch: data.id_chirlden_pitch,
          isCancelBooking: { $ne: true },
          date: {
            $elemMatch: { $gte: formattedPastDate, $lte: formattedCurrentDate }
          },
          is_booking_month: true
        }
      ]
    });
    if (bookedShifts && bookedShifts.length > 0) {
      return res.status(400).json({
        error: true,
        statusCode: 400,
        message: "Sân bạn đặt trong một tháng đã có ca đặt trước!! Vui lòng chọn sân khác!!!",
        data: bookedShifts
      });
    }
    data.date = [formattedCurrentDate];
    const shift = await creat(data);
    if (!shift) {
      return res.status(400).json(badRequest(400, "Thêm không thành công !!!"));
    }
    res.status(200).json(successfully(shift, "Thêm thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getShiftBookedByChildPitchAndNumberShift = async (req, res) => {
  try {
    const { id: id_chirlden_pitch } = req.params;
    const { number_shift } = req.query;
    const currentDate = /* @__PURE__ */ new Date();
    const futureDate = addDays(currentDate, 29);
    const pastDate = subDays(currentDate, 29);
    const formattedCurrentDate = format(currentDate, "yyyy-MM-dd");
    const formattedFutureDate = format(futureDate, "yyyy-MM-dd");
    const formattedPastDate = format(pastDate, "yyyy-MM-dd");
    const shifts = await getListByOptions({
      field: "$and",
      payload: [
        { id_chirlden_pitch },
        { isCancelBooking: { $ne: true } },
        {
          number_shift: {
            $in: [number_shift, null]
          }
        },
        {
          $or: [
            {
              date: {
                $elemMatch: {
                  $gte: formattedCurrentDate,
                  $lte: formattedFutureDate
                }
              }
            },
            {
              is_booking_month: true,
              date: {
                $elemMatch: {
                  $gte: formattedPastDate,
                  $lte: formattedCurrentDate
                }
              }
            }
          ]
        }
      ]
    });
    res.status(200).json(successfully(shifts, "lấy dữ lệu thành công!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getShiftsByChirldrenPitchBookingMonth = async (req, res) => {
  try {
    const { id: id_chirlden_pitch } = req.params;
    const { date, id_pitch } = req.query;
    const newDate = date ? date : format(/* @__PURE__ */ new Date(), "yyyy-MM-dd");
    const shiftsDefault = await getListByOptions({
      field: "$and",
      payload: [{ default: true }, { id_pitch }]
    });
    if (!shiftsDefault || shiftsDefault.length === 0) {
      return res.status(404).json(badRequest(404, "Không có shifts default!"));
    }
    const dateObject = parse(newDate, "yyyy-MM-dd", /* @__PURE__ */ new Date());
    const futureDate = addDays(dateObject, 29);
    const pastDate = subDays(dateObject, 29);
    const formattedCurrentDate = format(dateObject, "yyyy-MM-dd");
    const formattedFutureDate = format(futureDate, "yyyy-MM-dd");
    const formattedPastDate = format(pastDate, "yyyy-MM-dd");
    const shifts = await getListByOptions({
      field: "$or",
      payload: [
        {
          id_chirlden_pitch,
          isCancelBooking: { $ne: true },
          date: {
            $elemMatch: {
              $gte: formattedCurrentDate,
              $lte: formattedFutureDate
            }
          }
        },
        {
          id_chirlden_pitch,
          isCancelBooking: { $ne: true },
          date: {
            $elemMatch: { $gte: formattedPastDate, $lte: formattedCurrentDate }
          },
          is_booking_month: true
        }
      ]
    });
    const results = shiftsDefault.map((item) => ({
      ...item._doc,
      id_chirlden_pitch,
      date: (shifts.find(
        (shift) => shift.number_shift === item.number_shift || shift.number_shift === null
      ) || item).date,
      status_shift: !!shifts.find(
        (shift) => shift.number_shift === item.number_shift || shift.number_shift === null
      ) || false,
      default: !shifts.find(
        (shift) => shift.number_shift === item.number_shift || shift.number_shift === null
      ),
      _id: (shifts.find(
        (shift) => shift.number_shift === item.number_shift || shift.number_shift === null
      ) || item)._id,
      is_booking_month: (shifts.find(
        (shift) => shift.number_shift === item.number_shift || shift.number_shift === null
      ) || item).is_booking_month
    }));
    res.status(200).json(successfully(results, "lấy dữ lệu thành công!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getShiftsByPitch = async (req, res) => {
  try {
    const { id: id_pitch } = req.params;
    const { date } = req.query;
    const newDate = date ? date : format(/* @__PURE__ */ new Date(), "yyyy-MM-dd");
    const childrenPitchs = await getChildrenPitchsByParent$1(
      id_pitch
    );
    if (!childrenPitchs) {
      return res.status(400).json(badRequest(400, "Không dữ liệu!"));
    }
    const shiftsDefault = await getListByOptions({
      field: "$and",
      payload: [{ default: true }, { id_pitch }]
    });
    if (!shiftsDefault) {
      return res.status(404).json(badRequest(404, "Không có shifts default!"));
    }
    const dateObject = parse(newDate, "yyyy-MM-dd", /* @__PURE__ */ new Date());
    const pastDate = subDays(dateObject, 29);
    const formattedPastDate = format(pastDate, "yyyy-MM-dd");
    const newShifts = [];
    for (const childrenPitch of childrenPitchs) {
      const shifts = await getListByOptions({
        field: "$and",
        payload: [
          { id_chirlden_pitch: childrenPitch._id },
          { isCancelBooking: { $ne: true } },
          {
            $or: [
              { date: { $in: [newDate] } },
              {
                is_booking_month: true,
                date: {
                  $elemMatch: {
                    $gte: formattedPastDate,
                    $lte: newDate
                  }
                }
              }
            ]
          }
        ]
      });
      const results = shiftsDefault.map((item) => ({
        ...item._doc,
        id_chirlden_pitch: childrenPitch,
        id_pitch,
        date: (shifts.find(
          (shift) => shift.number_shift === item.number_shift || shift.number_shift === null
        ) || item).date,
        start_time: (shifts.find((shift) => shift.number_shift === item.number_shift) || item).start_time,
        end_time: (shifts.find((shift) => shift.number_shift === item.number_shift) || item).end_time,
        price: (shifts.find(
          (shift) => shift.number_shift === item.number_shift || shift.number_shift === null
        ) || item).price,
        status_shift: !!shifts.find(
          (shift) => shift.number_shift === item.number_shift || shift.number_shift === null
        ) || false,
        default: !shifts.find(
          (shift) => shift.number_shift === item.number_shift || shift.number_shift === null
        ),
        _id: (shifts.find(
          (shift) => shift.number_shift === item.number_shift || shift.number_shift === null
        ) || item)._id,
        find_opponent: (shifts.find((shift) => shift.number_shift === item.number_shift) || item).find_opponent,
        is_booking_month: (shifts.find(
          (shift) => shift.number_shift === item.number_shift || shift.number_shift === null
        ) || item).is_booking_month
      }));
      newShifts.push(...results);
    }
    res.status(200).json(successfully(newShifts, "lấy dữ lệu thành công!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const cancelBooking = async (req, res) => {
  try {
    const { id: shift_id } = req.params;
    const { id_booking } = req.query;
    const currentUser = req.user;
    const shift = await getById$c(shift_id);
    if (!shift) {
      return res.status(400).json(badRequest(400, "Không có ca!!!"));
    }
    const shiftCreatedAt = shift.createdAt;
    const currentDateTime = /* @__PURE__ */ new Date();
    const timeDifference = differenceInMinutes(currentDateTime, shiftCreatedAt);
    if (timeDifference > 30) {
      return res.status(400).json(badRequest(400, "Đã quá thời gian hủy!"));
    }
    const shiftUpdate = await update$g(shift_id, {
      isCancelBooking: true
    });
    await update$n({
      id: id_booking,
      status: "cancel"
    });
    await transporter.sendMail({
      from: {
        name: "FSport",
        address: process.env.USER_EMAIL
      },
      to: currentUser.email,
      subject: "Hủy lịch sân bóng thành công!",
      text: `Xin chào ${currentUser.name}. Bạn đã hủy lịch sân bóng ${shift.id_pitch.name} vào ${format(currentDateTime, "HH:mm:ss dd/MM/yyyy")}`,
      html: `
          <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title></title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }

        .container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }

        header {
          background-color: #3498db;
          color: #ffffff;
          text-align: center;
          padding: 20px;
        }

        h1 {
          margin: 0;
        }

        main {
          padding: 20px;
        }

        p {
          margin-bottom: 20px;
        }

        button {
          display: inline-block;
          padding: 10px 20px;
          background-color: #3498db;
          color: #ffffff;
          text-decoration: none;
          border-radius: 5px;
        }

        footer {
          text-align: center;
          padding: 10px;
          background-color: #f1f1f1;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <header>
          <h1>FSport</h1>
        </header>
        <main>
        <p>Xin chào ${currentUser.name},</p><p>Bạn đã hủy lịch ca ${shift.number_shift} tại sân bóng ${shift.id_pitch.name} vào ${format(
        currentDateTime,
        "HH:mm:ss dd/MM/yyyy"
      )}</p><p>Trân trọng.</p>
        </main>
        <footer>
          <p>© 2023 FSport</p>
        </footer>
      </div>
    </body>
    </html>`
    });
    res.status(200).json(successfully(shiftUpdate, "Hủy lịch thành công!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const locationJson$1 = JSON.parse(fs.readFileSync("locations.json"));
const getAll$2 = async (req, res) => {
  try {
    const locations = await getAllLocation();
    if (!locations || locations.length === 0) {
      return res.status(404).json(badRequest(404, "Không có dữ liệu!"));
    }
    res.status(200).json(successfully(locations, "Lấy dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getAllProvince = (req, res) => {
  res.json(locationJson$1.provinces);
};
const getAllDistrictByParent = (req, res) => {
  var _a;
  const { parent } = req.query;
  const data = (_a = locationJson$1.districts) == null ? void 0 : _a.filter((item) => item.parent === parent);
  res.json(data);
};
const getAllwardByParent = (req, res) => {
  var _a;
  const { parent } = req.query;
  const data = (_a = locationJson$1.wards) == null ? void 0 : _a.filter((item) => item.parent === parent);
  res.json(data);
};
const getById$4 = async (req, res) => {
  try {
    const location = await getOneLocation(req.params.id);
    if (!location) {
      return res.status(404).json(badRequest(404, "Không có dữ liệu!"));
    }
    const pitch = await getAllPitch({
      location_id: req.params.id
    });
    const data = {
      location: {
        ...location.toObject(),
        pitchs: pitch
      }
    };
    return res.status(200).json(successfully(data, "Lấy dữ liệu thành công"));
  } catch (error) {
    return res.status(500).json(serverError(error.message));
  }
};
const create$4 = async (req, res) => {
  try {
    const { error } = locationSchema.validate(req.body);
    if (error) {
      return res.status(400).json(badRequest(400, error.details[0].message));
    }
    const location = await creatLocation(req.body);
    if (!location) {
      return res.status(400).json(badRequest(400, "Thêm không thành công !!!"));
    }
    res.status(200).json(successfully(location, "Thêm thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const update$4 = async (req, res) => {
  try {
    const { error } = locationSchema.validate(req.body);
    if (error) {
      return res.status(400).json(badRequest(400, error.details[0].message));
    }
    const location = await updateLocation({
      ...req.body,
      id: req.params.id
    });
    if (!location) {
      return res.status(400).json(badRequest(400, "Sửa không thành công !!!"));
    }
    res.status(200).json(successfully(location, "Sửa thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const remove$2 = async (req, res) => {
  try {
    const location = await deleteLocation(req.params.id);
    if (!location) {
      return res.status(400).json(badRequest(400, "Xóa không thành công !!!"));
    }
    res.status(200).json(successfully(location, "Xóa thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const locationJson = JSON.parse(fs.readFileSync("locations.json"));
const getAll$1 = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 7,
      _sort = "createdAt",
      _order = "asc",
      districtId,
      wardId,
      searchText,
      minPrice,
      maxPrice,
      ...params
    } = req.query;
    const options2 = {
      page,
      limit,
      sort: {
        [_sort]: _order === "desc" ? -1 : 1
      },
      ...params,
      customLabels: {
        docs: "data"
      }
    };
    const pitchs = await getAllPitch(options2);
    if (!pitchs || pitchs.length === 0) {
      return res.status(404).json(badRequest(404, "Không có dữ liệu!"));
    }
    const { data: dataPitch, ...pagi } = pitchs;
    let data = {};
    if (districtId) {
      const wardIdsInDistricts = locationJson.wards.filter((ward) => ward.parent === districtId).map((ward) => ward.id);
      const newPitchs = pitchs.data.filter(
        (item) => wardIdsInDistricts.includes(item.location_id)
      );
      data.data = newPitchs;
    } else if (wardId) {
      const newPitchs = pitchs.data.filter(
        (item) => item.location_id === wardId
      );
      data.data = newPitchs;
    } else {
      data.data = dataPitch;
    }
    if (searchText && (minPrice || maxPrice)) {
      const filteredPitchs = data.data.filter((item) => {
        const isNameMatched = item.name.toLowerCase().includes(searchText.toLowerCase());
        const isPriceMatched = (!minPrice || item.average_price >= minPrice) && (!maxPrice || item.average_price <= maxPrice);
        return isNameMatched && isPriceMatched;
      });
      data.data = filteredPitchs;
    } else if (searchText) {
      const filteredPitchs = data.data.filter(
        (item) => item.name.toLowerCase().includes(searchText.toLowerCase())
      );
      data.data = filteredPitchs;
    } else if (minPrice || maxPrice) {
      const filteredPitchs = data.data.filter(
        (item) => (!minPrice || item.average_price >= minPrice) && (!maxPrice || item.average_price <= maxPrice)
      );
      data.data = filteredPitchs;
    }
    res.status(200).json(successfully({ ...data, ...pagi }, "Lấy dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const filterFeedBack = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 7,
      _sort = "createdAt",
      _order = "asc",
      minStart,
      maxStart,
      ...params
    } = req.query;
    const options2 = {
      page,
      limit,
      sort: {
        [_sort]: _order === "desc" ? -1 : 1
      },
      ...params,
      customLabels: {
        docs: "data"
      }
    };
    const pitchs = await filterFeedbackPitch(options2);
    if (!pitchs || pitchs.length === 0) {
      return res.status(404).json(badRequest(404, "Không có dữ liệu!"));
    }
    const { data: dataPitch, ...pagi } = pitchs;
    const pitchesWithStars = pitchs.data.map((pitch) => {
      const totalStars = pitch.feedback_id.reduce(
        (sum, feedback) => sum + feedback.quantity_star,
        0
      );
      const averageStars = pitch.feedback_id.length > 0 ? totalStars / pitch.feedback_id.length : 0;
      if (minStart || maxStart) {
        const isStarsMatched = (!minStart || averageStars >= minStart) && (!maxStart || averageStars <= maxStart);
        if (!isStarsMatched) {
          return null;
        }
      }
      return {
        _id: pitch._id,
        address: pitch.address,
        name: pitch.name,
        admin_pitch_id: pitch.admin_pitch_id,
        numberPitch: pitch.numberPitch,
        images: pitch.images,
        description: pitch.description,
        shifts: pitch.shifts,
        services: pitch.services,
        location_id: pitch.location_id,
        average_price: pitch.average_price,
        avatar: pitch.avatar,
        comment_id: pitch.comment_id,
        feedback_id: pitch.feedback_id,
        districts_id: pitch.districts_id,
        createdAt: pitch.createdAt,
        updatedAt: pitch.updatedAt,
        averageStars
      };
    });
    const filteredPitches = pitchesWithStars.filter((pitch) => pitch !== null);
    res.status(200).json(
      successfully(
        { data: filteredPitches, ...pagi },
        "Lấy dữ liệu thành công"
      )
    );
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getById$3 = async (req, res) => {
  try {
    const pitch = await getOnePitch(req.params.id);
    if (!pitch) {
      return res.status(404).json(badRequest(404, "Không có dữ liệu!"));
    }
    const pitchOneWithVietnamTime = {
      ...pitch.toObject(),
      createdAt: moment(pitch.createdAt).utcOffset(7).format("DD/MM/YYYY - HH:mm"),
      updatedAt: moment(pitch.updatedAt).utcOffset(7).format("DD/MM/YYYY - HH:mm")
    };
    res.status(200).json(successfully(pitchOneWithVietnamTime, "Lấy dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getPichByUser = async (req, res) => {
  try {
    const { _id: userId } = req.user;
    const pitches = await getPitchByUser(userId);
    if (!pitches || pitches.length === 0) {
      return res.status(200).json(badRequest(400, "Không có dữ liệu!"));
    }
    const updatedPitches = pitches.map((pitch) => {
      const location = locationJson.wards.find(
        (ward) => ward.id === pitch.location_id
      );
      const district = locationJson.districts.find(
        (district2) => district2.id === pitch.districts_id
      );
      return {
        ...pitch.toObject(),
        location_id: location ? location.name : pitch.location_id,
        districts_id: district ? district.name : pitch.districts_id,
        createdAt: moment(pitch.createdAt).utcOffset(7).format("DD/MM/YYYY - HH:mm"),
        updatedAt: moment(pitch.updatedAt).utcOffset(7).format("DD/MM/YYYY - HH:mm")
      };
    });
    res.status(200).json(successfully(updatedPitches[0], "Lấy dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getService = async (req, res) => {
  try {
    const pitch = await getServiceAdminPitch(req.params.id);
    if (!pitch) {
      return res.status(404).json({ error: "Lấy dữ liệu không thành công" });
    }
    const serviceData = await Promise.all(
      pitch.services.map(async (serviceId) => {
        const service = await getOneService(serviceId);
        const serviceWithVietnamTime = {
          _id: service._id,
          name: service.name,
          price: service.price,
          admin_pitch_id: service.admin_pitch_id,
          image: service.image,
          createdAt: moment(service.createdAt).utcOffset(7).format("DD/MM/YYYY - HH:mm"),
          updatedAt: moment(service.updatedAt).utcOffset(7).format("DD/MM/YYYY - HH:mm")
        };
        return serviceWithVietnamTime;
      })
    );
    res.status(200).json(successfully(serviceData, "Lấy dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getFeedbackPitch = async (req, res) => {
  try {
    const pitch = await getFeedbackPitch$1(req.params.id);
    if (!pitch) {
      return res.status(404).json(badRequest(404, "Không có dữ liệu!"));
    }
    const feedbackData = await Promise.all(
      pitch.feedback_id.map(async (feedbackId) => {
        const feedback = await getOneFeedback(feedbackId);
        const feedbackWithVietnamTime = {
          _id: feedback._id,
          id_user: feedback.id_user,
          id_pitch: feedback.id_pitch,
          quantity_star: feedback.quantity_star,
          createdAt: moment(feedback.createdAt).utcOffset(7).format("DD/MM/YYYY - HH:mm"),
          updatedAt: moment(feedback.updatedAt).utcOffset(7).format("DD/MM/YYYY - HH:mm")
        };
        return feedbackWithVietnamTime;
      })
    );
    const formattedPitchFeedback = {
      feedback_id: feedbackData,
      createdAt: pitch.createdAt,
      updatedAt: pitch.updatedAt
    };
    res.status(200).json(successfully(formattedPitchFeedback, "Lấy dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const create$3 = async (req, res) => {
  try {
    const { error } = pitchSchema.validate(req.body);
    if (error) {
      return res.status(400).json(badRequest(400, error.details[0].message));
    }
    const pitch = await creatPitch(req.body);
    if (!pitch) {
      return res.status(400).json(badRequest(400, "Thêm không thành công !!!"));
    }
    res.status(200).json(successfully(pitch, "Thêm thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const update$3 = async (req, res) => {
  try {
    console.log("User:", req.user);
    const { _id: userId } = req.user;
    const { error } = pitchSchema.validate(req.body);
    if (error) {
      return res.status(400).json(badRequest(400, error.details[0].message));
    }
    const pitch = await updatePitch({
      admin_pitch_id: userId,
      ...req.body,
      id: req.params.id
    });
    if (!pitch) {
      return res.status(400).json(badRequest(400, "Sửa không thành công !!!"));
    }
    const pitchUpdateVietnam = {
      ...pitch.toObject(),
      createdAt: moment(pitch.createdAt).utcOffset(7).format("DD/MM/YYYY - HH:mm"),
      updatedAt: moment(pitch.updatedAt).utcOffset(7).format("DD/MM/YYYY - HH:mm")
    };
    res.status(200).json(successfully(pitchUpdateVietnam, "Sửa thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const remove$1 = async (req, res) => {
  try {
    const pitch = await deletePitch(req.params.id);
    if (!pitch) {
      return res.status(400).json(badRequest(400, "Xóa không thành công !!!"));
    }
    res.status(200).json(successfully(pitch, "Xóa thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getAllFeedback = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      _sort = "createdAt",
      _order = "asc",
      ...params
    } = req.query;
    const options2 = {
      page,
      limit,
      sort: {
        [_sort]: _order === "desc" ? -1 : 1
      },
      ...params,
      customLabels: {
        docs: "data"
      }
    };
    const feedbacks = await getAllFeedback$1(options2);
    if (!feedbacks || feedbacks.length === 0) {
      return res.status(404).json(badRequest(404, "Không có dữ liệu!"));
    }
    const feedbackWithVietnamTime = {
      ...feedbacks,
      data: feedbacks.data.map((feedback) => ({
        ...feedback.toObject(),
        createdAt: moment(feedback.createdAt).utcOffset(7).format("DD/MM/YYYY - HH:mm"),
        updatedAt: moment(feedback.updatedAt).utcOffset(7).format("DD/MM/YYYY - HH:mm")
      }))
    };
    res.status(200).json(successfully(feedbackWithVietnamTime, "Lấy dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const createFeedback = async (req, res) => {
  try {
    const id_user = req.user._id;
    const id_pitch = req.body.id_pitch;
    const existingFeedback = await Feedback.findOne({ id_user, id_pitch });
    if (existingFeedback) {
      return res.status(400).json(badRequest(400, "Bạn đã đánh giá rồi!"));
    }
    const { error } = feedbackSchema.validate(
      { id_user, ...req.body },
      {
        abortEarly: false
      }
    );
    if (error) {
      const errors = error.details.map((err) => err.message);
      return res.status(400).json(badRequest(400, errors));
    }
    const feedback = await createFeedback$1({
      id_user,
      ...req.body
    });
    if (!feedback) {
      return res.status(400).json(badRequest(400, "Đánh giá thất bại!"));
    }
    await Pitch.findByIdAndUpdate(feedback.id_pitch, {
      $addToSet: { feedback_id: feedback._id }
    });
    const feedbackWithVietnamTime = {
      ...feedback.toObject(),
      createdAt: moment(feedback.createdAt).utcOffset(7).format("DD/MM/YYYY - HH:mm"),
      updatedAt: moment(feedback.updatedAt).utcOffset(7).format("DD/MM/YYYY - HH:mm"),
      user: req.user
    };
    res.status(200).json(successfully(feedbackWithVietnamTime, "Đánh giá thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const totalStarByUser = async (req, res) => {
  try {
    const { id_pitch } = req.params;
    const feedbacks = await Feedback.find({ id_pitch });
    let totalQuantityStar = 0;
    feedbacks.forEach((feedback) => {
      totalQuantityStar += feedback.quantity_star;
    });
    const numberOfFeedbacks = feedbacks.length;
    const averageRating = numberOfFeedbacks > 0 ? totalQuantityStar / numberOfFeedbacks : 0;
    res.status(200).json(successfully({ averageRating }, "Tính tổng số lượng sao thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const updateFeedback = async (req, res) => {
  try {
    const { idFeedback } = req.params;
    const { _id: id_user } = req.user;
    const { error } = feedbackSchema.validate(
      { id_user, ...req.body },
      {
        abortEarly: false
      }
    );
    if (error) {
      const errors = error.details.map((err) => err.message);
      return res.status(400).json(badRequest(400, errors));
    }
    const feedback = await getByOptions({
      field: "_id",
      payload: idFeedback
    });
    if (!feedback && feedback.id_user !== id_user)
      return res.status(403).json(badRequest(403, "Không có quyền!"));
    const newFeedback = await updateFeedback$1({
      idFeedback,
      id_user,
      ...req.body
    });
    if (!feedback) {
      return res.status(400).json(badRequest(400, "Sửa Đánh giá thất bại!"));
    }
    res.status(200).json(successfully(newFeedback, "Sửa Đánh giá thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const deleteFeedback = async (req, res) => {
  try {
    const { idFeedback } = req.params;
    const feedback = await deleteFeedback$1(idFeedback);
    if (!feedback) {
      return res.status(400).json(badRequest(400, "Xóa Đánh giá thất bại!"));
    }
    await Pitch.findByIdAndUpdate(feedback.id_pitch, {
      $pull: { feedback_id: feedback._id }
    });
    res.status(200).json(successfully(feedback, "Xóa Đánh giá thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getAll = async (req, res) => {
  try {
    const emails = await getAll$c();
    if (!emails) {
      return res.status(400).json(badRequest(400, "Lấy dữ liệu thất bại"));
    }
    res.status(200).json(successfully(emails, "Lấy dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getById$2 = async (req, res) => {
  try {
    const email = await getById$b(req.params.id);
    if (!email) {
      return res.status(400).json(badRequest(400, "Lấy dữ liệu thất bại"));
    }
    res.status(200).json(successfully(email, "Lấy dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const create$2 = async (req, res) => {
  const { email_to, subject, content, html } = req.body;
  try {
    const { error } = emailSchema.validate(req.body);
    if (error) {
      return res.status(400).json(badRequest(400, error.details[0].message));
    }
    await transporter.sendMail({
      from: {
        name: "FSport",
        address: process.env.USER_EMAIL
      },
      to: email_to,
      subject,
      text: content,
      html: `
      <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title></title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }

    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }

    header {
      background-color: #3498db;
      color: #ffffff;
      text-align: center;
      padding: 20px;
    }

    h1 {
      margin: 0;
    }

    main {
      padding: 20px;
    }

    p {
      margin-bottom: 20px;
    }

    button {
      display: inline-block;
      padding: 10px 20px;
      background-color: #3498db;
      color: #ffffff;
      text-decoration: none;
      border-radius: 5px;
    }

    footer {
      text-align: center;
      padding: 10px;
      background-color: #f1f1f1;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>FSport</h1>
    </header>
    <main>
    ${html}
    </main>
    <footer>
      <p>© 2023 FSport</p>
    </footer>
  </div>
</body>
</html>`
    });
    const email = await create$d(req.body);
    if (!email) {
      return res.status(400).json(badRequest(400, "Thêm không thành công !!!"));
    }
    res.status(200).json(successfully(email, "Send email thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const update$2 = async (req, res) => {
  try {
    const email = await update$f(req.params.id, req.body, {
      new: true
    });
    if (!email) {
      return res.status(400).json(badRequest(400, "Cập nhật không thành công !!!"));
    }
    res.status(200).json(successfully(email, "Cập nhật thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const remove = async (req, res) => {
  try {
    const email = await remove$d(req.params.id);
    if (!email) {
      return res.status(400).json(badRequest(400, "Xóa không thành công !!!"));
    }
    res.status(200).json(successfully(email, "Xóa thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const routerChildrentPitch = express.Router();
routerChildrentPitch.get("/", getAll$4);
routerChildrentPitch.get("/:id", getByID$1);
routerChildrentPitch.post(
  "/",
  verifyToken,
  verifyAdminPitch,
  create$6
);
routerChildrentPitch.put(
  "/:id",
  verifyToken,
  verifyAdminPitch,
  update$6
);
routerChildrentPitch.delete(
  "/:id",
  verifyToken,
  verifyAdminPitch,
  remove$4
);
routerChildrentPitch.get(
  "/parent/:id",
  getChildrenPitchsByParent
);
routerChildrentPitch.get(
  "/parent/booking-month/:id",
  getChildrenPitchsByParentBookingMonth
);
const Schema = mongoose.Schema;
const Payment = new Schema(
  {
    user_bank: { type: Schema.Types.ObjectId, ref: "User" },
    user_receiver: { type: Schema.Types.ObjectId, ref: "User" },
    payment_method: {
      type: String,
      require: true,
      enum: ["cash", "banking"],
      default: "cash"
    },
    price_received: { type: Number, require: true },
    code: { type: String, require: true },
    total_received: { type: Number, require: true },
    status: {
      type: String,
      require: true,
      enum: ["pending", "success", "error"],
      default: "pending"
    },
    message: { type: String, require: true, maxLength: 255 }
  },
  { collection: "payment", timestamps: true }
);
const PaymentModel = mongoose.model("payment", Payment);
const getList$1 = async (options2) => {
  const { skip, limit, sort, ...params } = options2;
  return await PaymentModel.find(params).populate([
    {
      path: "user_bank",
      model: userModel,
      select: { name: true, phone_number: true, email: true }
    },
    {
      path: "user_receiver",
      model: userModel,
      select: { name: true, phone_number: true, email: true }
    }
  ]).sort(sort).skip(skip).limit(limit);
};
const countDocuments = async () => {
  return await PaymentModel.countDocuments();
};
const getById$1 = async (paymentId) => {
  return await PaymentModel.findById(paymentId);
};
const create$1 = async (payment) => {
  const product = new PaymentModel(payment);
  return await product.save();
};
const update$1 = async (payment) => {
  const { id, ...data } = payment;
  return await PaymentModel.findByIdAndUpdate(payment.id, data, { new: true });
};
const destroy$1 = async (paymentId) => {
  return await PaymentModel.findByIdAndDelete(paymentId);
};
const getList = async (req, res) => {
  try {
    const { _sort = "createdAt", page = 1, limit = 10, _order = "desc", ...params } = req.query;
    const options2 = {
      skip: (page - 1) * limit,
      limit,
      sort: {
        [_sort]: _order === "desc" ? -1 : 1
      },
      ...params
    };
    const [payments, count] = await Promise.all([getList$1(options2), countDocuments()]);
    res.status(200).json({
      meassge: "Success",
      data: payments,
      currentPage: page,
      totalPage: Math.ceil(count / limit),
      length: payments.length
    });
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const getById = async (req, res) => {
  try {
    const payment = await getById$1(req.params.id);
    res.json({
      meassge: "Success",
      data: payment
    });
  } catch (error) {
    console.log(error);
  }
};
const create = async (req, res) => {
  try {
    const newPayment = await create$1(req.body);
    res.json({
      meassge: "New booking success",
      data: newPayment
    });
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const update = async (req, res) => {
  try {
    const paymentUpdated = await update$1({ ...req.body, id: req.params.id });
    res.json({
      meassge: "Update booking success",
      data: paymentUpdated
    });
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const destroy = async (req, res) => {
  try {
    const paymentDestroyed = await destroy$1(req.params.id);
    res.json({
      meassge: "Delete booking successfully",
      data: paymentDestroyed
    });
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
const validation$1 = (req, res, next) => {
  const schema = Joi.object({
    payment_method: Joi.string().required(),
    user_bank: Joi.string().required(),
    user_receiver: Joi.string().required(),
    price_received: Joi.number().required(),
    total_received: Joi.number().required(),
    status: Joi.string().required(),
    message: Joi.string().required()
  });
  const result = schema.validate(req.body);
  try {
    if (result.error) {
      return res.status(401).json({ error: 2, message: result.error.details[0].message });
    }
    next();
  } catch (err) {
    return res.status(500).json({
      err: 1,
      message: new Error(err).message
    });
  }
};
const router = express.Router();
router.route("/:id").get(getById).delete(destroy).put(validation$1, update);
router.route("/").get(getList).post(validation$1, create);
const paymentRouter = router;
const routerPermission = express.Router();
routerPermission.get(
  "/",
  verifyToken,
  getAll$a
);
routerPermission.get(
  "/:id",
  verifyToken,
  getById$a
);
routerPermission.post(
  "/",
  verifyToken,
  create$b
);
routerPermission.put(
  "/:id",
  verifyToken,
  update$d
);
routerPermission.delete(
  "/:id",
  verifyToken,
  remove$b
);
const routerBanner = express.Router();
routerBanner.get("/", getAll$6);
routerBanner.get("/:id", getOne);
routerBanner.post(
  "/",
  verifyToken,
  verifyAdmin,
  create$8
);
routerBanner.patch(
  "/:id",
  verifyToken,
  verifyAdmin,
  update$8
);
routerBanner.delete(
  "/:id",
  verifyToken,
  verifyAdmin,
  remove$6
);
const routerService = express.Router();
routerService.get("/", getAll$5);
routerService.get("/:idUser", getById$5);
routerService.post(
  "/",
  verifyToken,
  verifyAdminPitch,
  create$7
);
routerService.patch(
  "/:id",
  verifyToken,
  verifyAdminPitch,
  update$7
);
routerService.delete(
  "/:id",
  verifyToken,
  verifyAdminPitch,
  remove$5
);
const routerPost = express.Router();
routerPost.get("/", getAllPost);
routerPost.get("/:idPost", getPost);
routerPost.get("/comment/:idPost", getCommentPost);
routerPost.get("/user", getPostByUser);
routerPost.post(
  "/",
  verifyToken,
  verifyAdmin,
  createPost
);
routerPost.put(
  "/:idPost",
  verifyToken,
  verifyAdmin,
  updatePost
);
routerPost.delete(
  "/:idPost",
  verifyToken,
  verifyAdmin,
  deletePost
);
const routerRole = express.Router();
routerRole.get("/", getAll$9);
routerRole.get("/:id", getById$9);
routerRole.post(
  "/",
  verifyToken,
  verifyAdmin,
  create$a
);
routerRole.put(
  "/:id",
  verifyToken,
  verifyAdmin,
  update$c
);
routerRole.delete(
  "/:id",
  verifyToken,
  verifyAdmin,
  remove$a
);
const routerUser = express.Router();
routerUser.get("/users", verifyToken, getList$2);
routerUser.get(
  "/users/:id",
  verifyToken,
  verifyAdmin,
  getById$8
);
routerUser.post("/login", login);
routerUser.post("/login-google", loginWithGoogle);
routerUser.post("/login-otp", loginWithOtp);
routerUser.post("/verify-otp", verifyOtp);
routerUser.post("/refetch-otp", refetchOtp);
routerUser.post("/register", register);
routerUser.post("/register-otp", registerWithOTP);
routerUser.put("/users/:id", verifyToken, update$b);
routerUser.delete(
  "/users/:id",
  verifyToken,
  verifyAdmin,
  remove$9
);
routerUser.post(
  "/re_password",
  verifyToken,
  changePassword
);
routerUser.get("/booking-limit/:id", bookingLimit);
const routerOtp = express.Router();
routerOtp.get("/", verifyToken, getAll$8);
routerOtp.get("/:id", verifyToken, getById$7);
routerOtp.post("/", verifyToken, create$9);
routerOtp.put("/:id", verifyToken, update$a);
routerOtp.delete("/:id", verifyToken, remove$8);
const routerComment = express.Router();
routerComment.get("/", getAllComment);
routerComment.get("/:idComment", getComment);
routerComment.get("/post/:idPost", getCommentByPost);
routerComment.post(
  "/",
  verifyToken,
  createComment
);
routerComment.put(
  "/:idComment",
  verifyToken,
  updateComment
);
routerComment.delete(
  "/:idComment",
  verifyToken,
  deleteComment
);
const routerLocation = express.Router();
routerLocation.get("/provinces", getAllProvince);
routerLocation.get("/districts", getAllDistrictByParent);
routerLocation.get("/wards", getAllwardByParent);
routerLocation.get("/", getAll$2);
routerLocation.get("/:id", getById$4);
routerLocation.post("/", create$4);
routerLocation.put("/:id", update$4);
routerLocation.delete("/:id", remove$2);
const routerPitch = express.Router();
routerPitch.get("/", getAll$1);
routerPitch.get("/:id", getById$3);
routerPitch.get("/feedback/:id", getFeedbackPitch);
routerPitch.get(
  "/user/pitch",
  verifyToken,
  verifyAdminPitch,
  getPichByUser
);
routerPitch.get("/service/:id", getService);
routerPitch.post(
  "/",
  verifyToken,
  verifyAdminPitch,
  create$3
);
routerPitch.put(
  "/:id",
  verifyToken,
  verifyAdminPitch,
  update$3
);
routerPitch.delete("/:id", remove$1);
routerPitch.get("/filter/feedback", filterFeedBack);
const routerShift = express.Router();
routerShift.get("/", getAll$3);
routerShift.get("/:id", getByID);
routerShift.post("/", verifyToken, create$5);
routerShift.post(
  "/default",
  verifyToken,
  verifyAdminPitch,
  createShiftDefault
);
routerShift.put(
  "/:id",
  verifyToken,
  verifyAdminPitch,
  update$5
);
routerShift.put(
  "/default/:id",
  verifyToken,
  verifyAdminPitch,
  updateShiftDefault
);
routerShift.delete(
  "/:id",
  verifyToken,
  verifyAdminPitch,
  remove$3
);
routerShift.delete(
  "/default/:id",
  verifyToken,
  verifyAdminPitch,
  deleteShiftDefault
);
routerShift.put(
  "/find-opponent/:id",
  verifyToken,
  find_opponent
);
routerShift.post("/match-opponent", matchOpponent);
routerShift.get("/find-opponent/all", getAllShiftFindOpponent);
routerShift.get(
  "/find-opponent/pitch/:id",
  getAllShiftFindOpponentByPitch
);
routerShift.get(
  "/childrent-pitch/:id",
  getAllShiftByChirldrenPitch
);
routerShift.put(
  "/change-status-shift/:id",
  verifyToken,
  verifyAdminPitch,
  changeStatusShift
);
routerShift.get(
  "/default/pitch/:id",
  getAllShiftDefaultByPitch
);
routerShift.post(
  "/book-multiple-day",
  verifyToken,
  bookMultipleDay
);
routerShift.post(
  "/book-one-shift-full-month",
  verifyToken,
  bookOneShiftFullMonth
);
routerShift.post(
  "/book-childrenPicth-full-month",
  verifyToken,
  bookChildrenPicthFullMonth
);
routerShift.get(
  "/shift-booked/child-pitch-number-shift/:id",
  getShiftBookedByChildPitchAndNumberShift
);
routerShift.get(
  "/childrent-pitch/booking-month/:id",
  getShiftsByChirldrenPitchBookingMonth
);
routerShift.get("/pitch/:id", getShiftsByPitch);
routerShift.put(
  "/cancel-booking/:id",
  verifyToken,
  cancelBooking
);
const routerFeedback = express.Router();
routerFeedback.get("/", getAllFeedback);
routerFeedback.post(
  "/",
  verifyToken,
  createFeedback
);
routerFeedback.put(
  "/:idFeedback",
  verifyToken,
  updateFeedback
);
routerFeedback.delete(
  "/:idFeedback",
  verifyToken,
  deleteFeedback
);
routerFeedback.get(
  "/totalStarByPitch/:id_pitch",
  totalStarByUser
);
const sortObject = (obj) => {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
};
const config = {
  vnp_TmnCode: "NRQRJA4J",
  vnp_HashSecret: "GLQYEDNCQMOQNNTMBWMPAAEDPWTWLFOH",
  vnp_Url: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  vnp_Api: "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction",
  vnp_ReturnUrl: "http://localhost:8080/api/vnpay/vnpay_ipn"
};
class PayMentController {
  createUrl(req, res) {
    try {
      const { bank_code: bankCode = "", user_bank, user_receiver, price_received, total_received, vnp_OrderInfo, language = "vn" } = req.body;
      let date = /* @__PURE__ */ new Date();
      let createDate = moment(date).format("YYYYMMDDHHmmss");
      let ipAddr = req.headers["x-forwarded-for"] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
      let tmnCode = config.vnp_TmnCode;
      let secretKey = config.vnp_HashSecret;
      let vnpUrl = config.vnp_Url;
      let returnUrl = config.vnp_ReturnUrl + `?user_bank=${user_bank}&user_receiver=${user_receiver}&total_received=${total_received}`;
      let orderId = moment(date).format("DDHHmmss");
      console.log(price_received);
      let currCode = "VND";
      let vnp_Params = {};
      vnp_Params["vnp_Version"] = "2.1.0";
      vnp_Params["vnp_Command"] = "pay";
      vnp_Params["vnp_TmnCode"] = tmnCode;
      vnp_Params["vnp_Locale"] = language;
      vnp_Params["vnp_CurrCode"] = currCode;
      vnp_Params["vnp_TxnRef"] = orderId;
      vnp_Params["vnp_OrderInfo"] = vnp_OrderInfo + orderId;
      vnp_Params["vnp_OrderType"] = "other";
      vnp_Params["vnp_Amount"] = price_received * 100;
      vnp_Params["vnp_ReturnUrl"] = returnUrl;
      vnp_Params["vnp_IpAddr"] = ipAddr;
      vnp_Params["vnp_CreateDate"] = createDate;
      if (bankCode !== null && bankCode !== "") {
        vnp_Params["vnp_BankCode"] = bankCode;
      }
      vnp_Params = sortObject(vnp_Params);
      let signData = querystring.stringify(vnp_Params, { encode: false });
      let hmac = crypto.createHmac("sha512", secretKey);
      let signed = hmac.update(new Buffer(signData, "utf-8")).digest("hex");
      vnp_Params["vnp_SecureHash"] = signed;
      vnpUrl += "?" + querystring.stringify(vnp_Params, { encode: false });
      return res.status(200).json({ url_redierct: vnpUrl, url_return: config.vnp_ReturnUrl });
    } catch (error) {
      res.status(500).json(serverError(error.message));
    }
  }
  async getDataReturn(req, res, next) {
    try {
      let vnp_Params = req.query;
      let secureHash = vnp_Params["vnp_SecureHash"];
      let orderId = vnp_Params["vnp_TxnRef"];
      let rspCode = vnp_Params["vnp_ResponseCode"];
      delete vnp_Params["vnp_SecureHash"];
      delete vnp_Params["vnp_SecureHashType"];
      const { user_bank, user_receiver, total_received, ...obj } = vnp_Params;
      vnp_Params = sortObject(obj);
      let secretKey = config.vnp_HashSecret;
      let signData = querystring.stringify(vnp_Params, { encode: false });
      let hmac = crypto.createHmac("sha512", secretKey);
      let signed = hmac.update(new Buffer(signData, "utf-8")).digest("hex");
      let paymentStatus = "0";
      let checkOrderId = true;
      let checkAmount = true;
      if (secureHash === signed) {
        if (checkOrderId) {
          if (checkAmount) {
            if (paymentStatus == "0") {
              if (rspCode == "00") {
                const isMatch = await PaymentModel.findOne({ code: vnp_Params["vnp_TxnRef"] });
                if (!isMatch) {
                  const newPayment = await PaymentModel.create({
                    user_bank,
                    user_receiver,
                    price_received: vnp_Params["vnp_Amount"] / 100,
                    total_received,
                    code: vnp_Params["vnp_TxnRef"],
                    message: vnp_Params["vnp_OrderInfo"],
                    payment_method: "banking",
                    status: "success"
                  });
                  res.redirect(
                    process.env.NODE_URL_CLIENT + `/checkout?mode=order&code=${vnp_Params["vnp_TxnRef"]}&payment_id=${newPayment._id}`
                  );
                }
              } else {
                res.redirect(process.env.NODE_URL_CLIENT + "/checkout");
              }
            }
          }
        }
      } else {
        res.status(200).json({ RspCode: "97", Message: "Checksum failed" });
      }
    } catch (error) {
      res.status(500).json(serverError(error.message));
    }
  }
}
const PayMentController$1 = new PayMentController();
const validation = (req, res, next) => {
  const schema = Joi.object({
    user_bank: Joi.string().required(),
    user_receiver: Joi.string().required(),
    vnp_OrderInfo: Joi.string().required(),
    price_received: Joi.number().required(),
    total_received: Joi.number().required(),
    bank_code: Joi.string().allow(""),
    language: Joi.string()
  });
  const result = schema.validate(req.body);
  try {
    if (result.error) {
      return res.status(401).json({ error: 2, message: result.error.details[0].message });
    }
    next();
  } catch (err) {
    return res.status(500).json({
      err: 1,
      message: new Error(err).message
    });
  }
};
const routerPayment = express.Router();
routerPayment.post("/create-url", validation, PayMentController$1.createUrl);
routerPayment.get("/vnpay_ipn", PayMentController$1.getDataReturn);
const routerEmail = express.Router();
routerEmail.get("/", getAll);
routerEmail.get("/:id", getById$2);
routerEmail.post("/", create$2);
routerEmail.put("/:id", update$2);
routerEmail.delete("/:id", remove);
const getRevenueByYear = async (year, pitchUser) => {
  const condition = pitchUser ? {
    $match: {
      user_receiver: new mongoose.Types.ObjectId(pitchUser),
      createdAt: {
        $gte: /* @__PURE__ */ new Date(`${year}-01-01`),
        $lt: /* @__PURE__ */ new Date(`${year + 1}-01-01`)
      }
    }
  } : {
    $match: {
      createdAt: {
        $gte: /* @__PURE__ */ new Date(`${year}-01-01`),
        $lt: /* @__PURE__ */ new Date(`${year + 1}-01-01`)
      }
    }
  };
  const pipeLine2 = [
    condition,
    {
      $group: {
        _id: { month: { $month: "$createdAt" }, year: "$year" },
        totalPrice: { $sum: "$total_received" },
        totalBooking: { $sum: 1 },
        successCount: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } },
        cancelCount: { $sum: { $cond: [{ $eq: ["$status", "cancel"] }, 1, 0] } }
      }
    },
    {
      $group: {
        _id: null,
        months: {
          $push: {
            month: "$_id.month",
            totalPrice: "$totalPrice",
            totalBooking: "$totalBooking",
            successCount: "$successCount",
            cancelCount: "$cancelCount"
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        year: 1,
        months: {
          $map: {
            input: { $range: [1, 13] },
            as: "monthIndex",
            in: {
              $cond: [
                {
                  $in: ["$$monthIndex", "$months.month"]
                },
                {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$months",
                        as: "month",
                        cond: { $eq: ["$$month.month", "$$monthIndex"] }
                      }
                    },
                    0
                  ]
                },
                { month: "$$monthIndex", totalPrice: 0, totalBooking: 0, successCount: 0, cancelCount: 0 }
              ]
            }
          }
        }
      }
    },
    {
      $unwind: "$months"
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$months.totalPrice" },
        months: { $push: "$months" }
      }
    },
    {
      $project: {
        _id: 0,
        year: 1,
        total: 1,
        months: 1
      }
    }
  ];
  const result = await PaymentModel.aggregate(pipeLine2);
  if (result && result[0])
    return result[0];
  const months = Array.from({ length: 12 }, (_, index) => ({ totalPrice: 0, month: index + 1 }));
  return { total: 0, months };
};
const getRevenueByMonth = async ({ month, year, startTime, endTime, pitchUser }) => {
  const condition = pitchUser ? {
    $match: {
      user_receiver: new mongoose.Types.ObjectId(pitchUser),
      createdAt: {
        $gte: new Date(year, month - 1, startTime),
        $lte: new Date(year, month - 1, endTime)
      }
    }
  } : {
    $match: {
      createdAt: {
        $gte: new Date(year, month - 1, startTime),
        $lte: new Date(year, month - 1, endTime)
      }
    }
  };
  const datesArray = Array.from({ length: +endTime - +startTime + 1 }, (_, index) => new Date(year, month - 1, +startTime + index));
  const pipeLine2 = [
    condition,
    {
      $group: {
        _id: { $dayOfMonth: "$createdAt" },
        totalPrice: { $sum: "$total_received" },
        totalBooking: { $sum: 1 },
        successCount: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } },
        cancelCount: { $sum: { $cond: [{ $eq: ["$status", "cancel"] }, 1, 0] } }
      }
    }
  ];
  const result = await PaymentModel.aggregate(pipeLine2);
  const groupedData = datesArray.map((date) => {
    const day = date.getDate();
    const found = result.find((item) => item._id === day);
    return {
      day,
      totalPrice: found ? found.totalPrice : 0,
      totalBooking: found ? found.totalBooking : 0,
      successCount: found ? found.successCount : 0,
      cancelCount: found ? found.cancelCount : 0
    };
  });
  return groupedData;
};
class StatisticalController {
  async revenueByYear(req, res) {
    const year = Number(req.query.year) || Number((/* @__PURE__ */ new Date()).getFullYear());
    const pitchUser = req.query.pitch_user || null;
    try {
      const revenue = await getRevenueByYear(year, pitchUser);
      res.json({
        message: "Lấy dữ liệu thống kê thành công",
        data: { year, ...revenue }
      });
    } catch (error) {
      res.status(500).json(serverError(error.message));
    }
  }
  async revenueByMonth(req, res) {
    const month = Number(req.params.month) || 1;
    const pitchUser = req.query.pitch_user || null;
    const startTime = req.query.start_time || 1;
    const endTime = req.query.end_time || 31;
    const year = req.query.year || 2023;
    const query = {
      month,
      pitchUser,
      startTime,
      year,
      endTime
    };
    try {
      const revenue = await getRevenueByMonth(query);
      const total = (revenue == null ? void 0 : revenue.reduce((a, b) => a + b.totalPrice, 0)) || 0;
      res.json({
        message: "Lấy dữ liệu thống kê thành công",
        data: { month, pitchUser, startTime, endTime, total, days: revenue }
      });
    } catch (error) {
      res.status(500).json(serverError(error.message));
    }
  }
  async booking(req, res) {
  }
}
const StatisticalController$1 = new StatisticalController();
const statisticalRouter = express.Router();
statisticalRouter.route("/revenue/:month").get(StatisticalController$1.revenueByMonth);
statisticalRouter.route("/revenue").get(StatisticalController$1.revenueByYear);
function routes(app2) {
  app2.use("/api/bookings", bookingRouter);
  app2.use("/api/payments", paymentRouter);
  app2.use("/api/permissions", routerPermission);
  app2.use("/api/roles", routerRole);
  app2.use("/api", routerUser);
  app2.use("/api/otps", routerOtp);
  app2.use("/api/posts", routerPost);
  app2.use("/api/comments", routerComment);
  app2.use("/api/banners", routerBanner);
  app2.use("/api/services", routerService);
  app2.use("/api/childrentPicth", routerChildrentPitch);
  app2.use("/api/shift", routerShift);
  app2.use("/api/location", routerLocation);
  app2.use("/api/pitch", routerPitch);
  app2.use("/api/feedback", routerFeedback);
  app2.use("/api/vnpay", routerPayment);
  app2.use("/api/email", routerEmail);
  app2.use("/api/statistical", statisticalRouter);
}
const app = express();
dotenv.config();
try {
  (async () => {
    await connectDB();
  })();
} catch (error) {
  console.log("error connect db", error);
}
app.use(cors());
app.use(express.json());
app.use(morgan("tiny"));
const options = {
  definition: {
    openapi: "3.1.0",
    info: {
      title: "Document bóng đá soi cầu APIs",
      version: "1.0",
      description: "Here is the api documentation of the bóng đá soi cầu microservice project"
    },
    servers: [
      {
        url: "http://localhost:8080"
      }
    ],
    components: {
      securitySchemes: {
        Bearer_Auth: {
          type: "http",
          bearerFormat: "Bearer",
          scheme: "Bearer",
          name: "Authorization",
          description: 'Enter JWT token in format "Bearer [token]"'
        }
      }
    }
  },
  apis: ["./src/router/*.router.js", "./src/router/**/*.router.js", "./src/router/**/*.doc.yaml"]
};
const openapiSpecification = swaggerJSDoc(options);
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiSpecification));
routes(app);
connectDB();
const viteNodeApp = app;
export {
  viteNodeApp
};
