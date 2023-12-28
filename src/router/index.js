import bookingRouter from "./booking/booking.router.js";
import routerChildrentPitch from "./childrentPitch.router.js";
import paymentRouter from "./payment.router.js";
import routerPermission from "./permission.router.js";
import routerBanner from "./banner.router.js";
import routerService from "./service.router.js";
import routerPost from "./post.router.js";
import routerRole from "./role.router.js";
import routerUser from "./user.router.js";
import routerOtp from "./otp.router.js";
import routerComment from "./comment.router.js";
import routerLocation from "./location.router.js";
import routerPitch from "./pitch.router.js";
import routerShift from "./shift.router.js";
import routerFeedback from "./feedback.router.js";
import routerPayment from "./vnpay.router.js";
import routerEmail from "./email.router.js";
import statisticalRouter from "./statistical/statistical.router.js";

export default function routes(app) {
  app.use("/api/bookings", bookingRouter);
  app.use("/api/payments", paymentRouter);
  app.use("/api/permissions", routerPermission);
  app.use("/api/roles", routerRole);
  app.use("/api", routerUser);
  app.use("/api/otps", routerOtp);
  app.use("/api/posts", routerPost);
  app.use("/api/comments", routerComment);
  app.use("/api/banners", routerBanner);
  app.use("/api/services", routerService);
  app.use("/api/childrentPicth", routerChildrentPitch);
  app.use("/api/shift", routerShift);
  app.use("/api/location", routerLocation);
  app.use("/api/pitch", routerPitch);
  app.use("/api/feedback", routerFeedback);
  app.use("/api/vnpay", routerPayment);
  app.use("/api/email", routerEmail);
  app.use("/api/statistical", statisticalRouter);
}
