import { ApiError } from "../utils/apiError.js";

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, "Access denied");
    }
    next();
  };
};

export { authorizeRoles };
