import { Router } from "express";
import {
  changePassword,
  forgotPassword,
  getAllUsers,
  getMe,
  login,
  logout,
  refreshAccessToken,
  register,
  updateRoleToOwner,
  updateUserDetails,
} from "../controllers/user.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

const router = Router();

router.route("/register").post(register);
router.route("/login").post(login);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/forgot-password").post(forgotPassword);
router.route("/logout").get(verifyJWT, logout);
router.route("/me").get(verifyJWT, getMe);
router.route("/update-details").patch(verifyJWT, updateUserDetails);
router.route("/change-password").patch(verifyJWT, changePassword);
router.route("/become-owner").patch(verifyJWT, updateRoleToOwner);
router.route("/users").get(verifyJWT, authorizeRoles("Admin"), getAllUsers);

export default router;
