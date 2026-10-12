import { catchAsync } from "../../utils/catchAsync";
import { getAuthUser } from "../../utils/request-context";
import { sendSuccess } from "../../utils/sendResponse";
import * as userService from "./user.service";
import type { UpdateMeInput } from "./user.validation";

export const updateMe = catchAsync(async (req, res) => {
  const { userId } = getAuthUser(req);
  const user = await userService.updateMe(userId, req.body as UpdateMeInput);
  sendSuccess(res, { message: "Profile updated successfully", data: { user } });
});
