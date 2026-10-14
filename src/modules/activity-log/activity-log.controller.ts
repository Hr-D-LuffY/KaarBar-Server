import { catchAsync } from "../../utils/catchAsync";
import { getShopContext } from "../../utils/request-context";
import { sendSuccess } from "../../utils/sendResponse";
import * as activityLogService from "./activity-log.service";
import type { ListActivityLogsQuery } from "./activity-log.validation";

export const listActivityLogs = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const { logs, meta } = await activityLogService.listActivityLogs(
    shopId,
    req.query as unknown as ListActivityLogsQuery,
  );
  sendSuccess(res, { message: "Activity logs fetched successfully", data: { logs }, meta });
});
